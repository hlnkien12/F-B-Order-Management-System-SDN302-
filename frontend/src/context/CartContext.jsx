import { createContext, useContext, useState, useEffect } from "react";
import { toVietnamese } from "../utils/vietnameseDictionary";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    // 1. Ma ban hien tai (vd: T01)
    const [tableCode, setTableCode] = useState(() => {
        return localStorage.getItem("order_table_code") || "";
    });

    // 2. Danh sach mon trong gio
    const [cartItems, setCartItems] = useState(() => {
        const saved = localStorage.getItem("order_cart_items");
        return saved ? JSON.parse(saved) : [];
    });

    // 3. Ghi chu mon an
    const [note, setNote] = useState("");

    // Luu localStorage moi khi doi ban hoac doi mon
    useEffect(() => {
        localStorage.setItem("order_table_code", tableCode);
    }, [tableCode]);

    useEffect(() => {
        localStorage.setItem("order_cart_items", JSON.stringify(cartItems));
    }, [cartItems]);

    // 4. Them mon vao gio
    const addToCart = (item) => {
        setCartItems((prev) => {
            const existing = prev.find((i) => i.menuItemId === item._id);
            if (existing) {
                return prev.map((i) =>
                    i.menuItemId === item._id
                        ? { ...i, quantity: Math.min(i.quantity + 1, 50) }
                        : i
                );
            }
            return [
                ...prev,
                {
                    menuItemId: item._id,
                    name: toVietnamese(item.name),
                    price: item.price,
                    image: item.image,
                    quantity: 1
                }
            ];
        });
    };

    // 5. Cap nhat so luong mon
    const updateQuantity = (menuItemId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(menuItemId);
            return;
        }
        setCartItems((prev) =>
            prev.map((i) =>
                i.menuItemId === menuItemId
                    ? { ...i, quantity: Math.min(quantity, 50) }
                    : i
            )
        );
    };

    // 6. Xoa 1 mon khoi gio
    const removeFromCart = (menuItemId) => {
        setCartItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
    };

    // 7. Xoa sach gio hang
    const clearCart = () => {
        setCartItems([]);
        setNote("");
    };

    // 8. Tinh tong so luong va tong tien
    const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
                totalCount,
                totalAmount
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
