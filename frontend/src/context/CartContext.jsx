import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toVietnamese } from "../utils/vietnameseDictionary";
import { useAuth } from "./AuthContext";
import axiosClient from "../api/axiosClient";
import { socket } from "../socket/socket";

const CartContext = createContext();

const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    );
};

const getClearedIdsSet = () => {
    try {
        const arr = JSON.parse(sessionStorage.getItem("cleared_order_ids") || "[]");
        return new Set(Array.isArray(arr) ? arr.map(String) : []);
    } catch {
        return new Set();
    }
};

export const CartProvider = ({ children }) => {
    const { user, loading: authLoading } = useAuth();

    // 1. Ma ban hien tai (luu trong sessionStorage de moi Tab la 1 thiet bi khach hang doc lap)
    const [tableCode, setTableCode] = useState(() => {
        return sessionStorage.getItem("order_table_code") || "";
    });

    // 2. Danh sach mon trong gio
    const [cartItems, setCartItems] = useState(() => {
        const saved = sessionStorage.getItem("order_cart_items");
        if (!saved) return [];
        try {
            const parsed = JSON.parse(saved);
            return parsed.map((item) => ({
                ...item,
                cartKey: item.cartKey || `${item.menuItemId}__${item.selectedOption || ""}`
            }));
        } catch {
            return [];
        }
    });

    // 3. Ghi chu mon an
    const [note, setNote] = useState("");

    // 4. Danh sach don da goi trong phien hom nay
    const [sessionOrders, setSessionOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState("");

    // Luu sessionStorage moi khi doi ban hoac doi mon
    useEffect(() => {
        sessionStorage.setItem("order_table_code", tableCode);
    }, [tableCode]);

    useEffect(() => {
        sessionStorage.setItem("order_cart_items", JSON.stringify(cartItems));
    }, [cartItems]);

    // 5. Tai danh sach don cua phien hom nay (cho ca khach dang nhap va khach vang lai)
    const refreshSessionOrders = useCallback(async () => {
        if (authLoading) return;
        try {
            setOrdersLoading(true);
            setOrdersError("");

            const clearedSet = getClearedIdsSet();
            let guestIds = [];
            try {
                guestIds = JSON.parse(sessionStorage.getItem("guest_orders") || "[]");
                if (!Array.isArray(guestIds)) guestIds = [];
            } catch {
                guestIds = [];
            }

            if (user) {
                const res = await axiosClient.get("/orders/my");
                const userOrders = (res.data?.data || res.data || []).filter(
                    (ord) => isToday(ord.createdAt) && !clearedSet.has(String(ord._id))
                );

                // Gop them cac don guest tren cung thiet bi (neu khach vua dang nhap sau khi dat)
                if (guestIds.length > 0) {
                    const existingIds = new Set(userOrders.map((o) => String(o._id)));
                    const missingGuestIds = guestIds.filter(
                        (id) => !existingIds.has(String(id)) && !clearedSet.has(String(id))
                    );
                    if (missingGuestIds.length > 0) {
                        try {
                            const guestRes = await axiosClient.post("/orders/batch-track", {
                                orderIds: missingGuestIds
                            });
                            const extraOrders = (guestRes.data?.data || guestRes.data || []).filter(
                                (ord) => isToday(ord.createdAt) && !clearedSet.has(String(ord._id))
                            );
                            userOrders.push(...extraOrders);
                        } catch {
                            // Bo qua neu khong lay duoc don phu
                        }
                    }
                }

                userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setSessionOrders(userOrders);
            } else {
                const activeGuestIds = guestIds.filter((id) => !clearedSet.has(String(id)));
                if (activeGuestIds.length === 0) {
                    setSessionOrders([]);
                    return;
                }
                const res = await axiosClient.post("/orders/batch-track", {
                    orderIds: activeGuestIds
                });
                const list = (res.data?.data || res.data || []).filter(
                    (ord) => isToday(ord.createdAt) && !clearedSet.has(String(ord._id))
                );
                list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setSessionOrders(list);
            }
        } catch (err) {
            setOrdersError(
                typeof err === "string" ? err : "Không thể tải danh sách món đã gọi!"
            );
        } finally {
            setOrdersLoading(false);
        }
    }, [user, authLoading]);

    useEffect(() => {
        refreshSessionOrders();
    }, [refreshSessionOrders]);

    // 6. Lang nghe Socket.IO cho tat ca don trong phien de cap nhat trang thai realtime
    useEffect(() => {
        if (!sessionOrders || sessionOrders.length === 0) return;

        const orderIds = sessionOrders.map((o) => String(o._id));
        orderIds.forEach((id) => socket.emit("order:join", id));

        const handleUpdated = (data) => {
            if (!data || !data.id) return;
            if (data.tableCode) {
                setTableCode(data.tableCode);
            }
            setSessionOrders((prev) =>
                prev.map((ord) =>
                    String(ord._id) === String(data.id)
                        ? {
                              ...ord,
                              tableId: data.tableId ?? ord.tableId,
                              tableName: data.tableName ?? ord.tableName,
                              changeTableReason:
                                  data.changeTableReason ?? ord.changeTableReason,
                              status: data.status ?? ord.status,
                              paymentRequested:
                                  data.paymentRequested !== undefined
                                      ? data.paymentRequested
                                      : ord.paymentRequested,
                              paymentMethod: data.paymentMethod ?? ord.paymentMethod,
                              cancelReason: data.cancelReason ?? ord.cancelReason,
                              feedback: data.feedback ?? ord.feedback,
                              voidRefund: data.voidRefund ?? ord.voidRefund,
                              updatedAt: data.updatedAt || ord.updatedAt
                          }
                        : ord
                )
            );
        };

        socket.on("order:updated", handleUpdated);

        return () => {
            orderIds.forEach((id) => socket.emit("order:leave", id));
            socket.off("order:updated", handleUpdated);
        };
    }, [sessionOrders.length]);

    // 7. Xoa / luu tru phien da hoan tat de don ban cho luot khach tiep theo
    const clearGuestOrders = useCallback(() => {
        try {
            const currentCleared = Array.from(getClearedIdsSet());
            const sessionIds = sessionOrders.map((o) => String(o._id));
            const merged = Array.from(new Set([...currentCleared, ...sessionIds])).slice(-100);
            sessionStorage.setItem("cleared_order_ids", JSON.stringify(merged));
        } catch {
            // Bo qua loi sessionStorage
        }
        sessionStorage.removeItem("guest_orders");
        setSessionOrders([]);
    }, [sessionOrders]);

    // Lop tu dong don phien neu tat ca don cu trong phien deu da hoan tat (completed / cancelled)
    const archiveFinishedSessionIfDone = useCallback(() => {
        if (sessionOrders.length === 0) return;
        const allFinished = sessionOrders.every(
            (ord) => ord.status === "completed" || ord.status === "cancelled"
        );
        if (allFinished) {
            clearGuestOrders();
        }
    }, [sessionOrders, clearGuestOrders]);

    // 8. Them mon vao gio (ho tro loai / size + Lop 2: Tu dong don phien cu da thanh toan khi chon mon moi)
    const addToCart = (item, selectedOption) => {
        archiveFinishedSessionIfDone();

        const defaultOpt = item.type === "drink" ? "Size M" : "Thường";
        const optLabel = selectedOption || defaultOpt;

        let delta = 0;
        if (Array.isArray(item.options)) {
            const found = item.options.find((o) => o.label === optLabel);
            if (found) delta = found.priceDelta || 0;
        } else {
            if (optLabel === "Đặc biệt") delta = 15000;
            if (optLabel === "Size L") delta = 5000;
            if (optLabel === "Size XL") delta = 10000;
        }

        const finalPrice = item.price + delta;
        const key = `${item._id}__${optLabel}`;

        setCartItems((prev) => {
            const existing = prev.find(
                (i) =>
                    i.cartKey === key ||
                    (!i.cartKey &&
                        i.menuItemId === item._id &&
                        (i.selectedOption || "") === optLabel)
            );
            if (existing) {
                return prev.map((i) =>
                    i.cartKey === key ||
                    (!i.cartKey &&
                        i.menuItemId === item._id &&
                        (i.selectedOption || "") === optLabel)
                        ? { ...i, quantity: Math.min(i.quantity + 1, 50) }
                        : i
                );
            }
            return [
                ...prev,
                {
                    cartKey: key,
                    menuItemId: item._id,
                    name: toVietnamese(item.name),
                    selectedOption: optLabel,
                    price: finalPrice,
                    basePrice: item.price,
                    image: item.image,
                    quantity: 1
                }
            ];
        });
    };

    // 9. Cap nhat so luong mon theo cartKey
    const updateQuantity = (cartKey, quantity) => {
        if (quantity <= 0) {
            removeFromCart(cartKey);
            return;
        }
        setCartItems((prev) =>
            prev.map((i) =>
                i.cartKey === cartKey || i.menuItemId === cartKey
                    ? { ...i, quantity: Math.min(quantity, 50) }
                    : i
            )
        );
    };

    // 10. Xoa 1 mon khoi gio
    const removeFromCart = (cartKey) => {
        setCartItems((prev) =>
            prev.filter((i) => i.cartKey !== cartKey && i.menuItemId !== cartKey)
        );
    };

    // 11. Xoa sach gio hang
    const clearCart = () => {
        setCartItems([]);
        setNote("");
    };

    // 12. Khoi phuc lai cac mon vao gio hang (dung khi khach huy don & dat lai)
    const restoreItemsToCart = (items) => {
        if (!Array.isArray(items) || items.length === 0) return;
        const restored = items.map((i) => {
            const opt = i.selectedOption || "";
            return {
                cartKey: `${i.menuItemId}__${opt}`,
                menuItemId: i.menuItemId,
                name: toVietnamese(i.name),
                selectedOption: opt,
                price: i.price,
                quantity: i.quantity,
                image: i.image || "/images/pho-bo.jpg"
            };
        });
        setCartItems(restored);
    };

    // 13. Luu ma don hang cua khach vang lai vao sessionStorage
    const saveGuestOrder = useCallback((orderId) => {
        if (!orderId) return;
        try {
            const current = JSON.parse(sessionStorage.getItem("guest_orders") || "[]");
            const updated = [
                String(orderId),
                ...current.filter((id) => id !== String(orderId))
            ].slice(0, 30);
            sessionStorage.setItem("guest_orders", JSON.stringify(updated));
        } catch {
            sessionStorage.setItem("guest_orders", JSON.stringify([String(orderId)]));
        }
    }, []);

    // 14. Tinh tong so luong, tong tien gio hang va so don dang xu ly
    const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const activeOrderCount = sessionOrders.filter((ord) =>
        ["pending", "confirmed", "served"].includes(ord.status)
    ).length;
    const hasActiveOrders = activeOrderCount > 0;

    return (
        <CartContext.Provider
            value={{
                tableCode,
                setTableCode,
                cartItems,
                note,
                setNote,
                addToCart,
                updateQuantity,
                removeFromCart,
                clearCart,
                restoreItemsToCart,
                saveGuestOrder,
                clearGuestOrders,
                archiveFinishedSessionIfDone,
                totalCount,
                totalAmount,
                sessionOrders,
                setSessionOrders,
                ordersLoading,
                ordersError,
                refreshSessionOrders,
                activeOrderCount,
                hasActiveOrders
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
