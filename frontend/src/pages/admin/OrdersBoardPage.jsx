import { useEffect, useState, useCallback, useMemo } from "react";
import {
    Row,
    Col,
    Card,
    Badge,
    Button,
    Form,
    ButtonGroup,
    Spinner,
    Alert,
    Modal,
    Table,
    Pagination
} from "react-bootstrap";
import axiosClient from "../../api/axiosClient";
import { socket } from "../../socket/socket";
import { toVietnamese } from "../../utils/vietnameseDictionary";

const STATUS_BADGE = {
    pending: { label: "Chờ xác nhận", bg: "warning", text: "dark" },
    confirmed: { label: "Đang chuẩn bị", bg: "primary", text: "white" },
    served: { label: "Đã phục vụ (Chờ thu tiền)", bg: "info", text: "dark" },
    completed: { label: "Đã thanh toán", bg: "success", text: "white" },
    cancelled: { label: "Đã hủy", bg: "danger", text: "white" }
};

const ACTIVE_PAGE_SIZE = 6;
const HISTORY_PAGE_SIZE = 10;

const getLocalToday = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

// Ham phat am thanh bao don moi hoac yeu cau thanh toan bang Web Audio API
const playNotificationSound = () => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
    } catch {
        // Bo qua neu trinh duyet chan tu phat am thanh
    }
};

// Tinh do uu tien sap xep cho Don Dang Phuc Vu (nho hon = uu tien cao hon)
const getActiveOrderPriority = (ord) => {
    if (ord.feedback?.isBadFeedback && !ord.voidRefund?.isProcessed) return 0; // Uu tien cao nhat khi co feedback toi can xu ly
    if (ord.paymentRequested && ["confirmed", "served"].includes(ord.status)) return 1;
    if (ord.status === "pending") return 2;
    if (ord.status === "confirmed") return 3;
    return 4; // served chua goi thanh toan
};

const OrdersBoardPage = () => {
    const [orders, setOrders] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [realtimeAlert, setRealtimeAlert] = useState("");
    const [paymentAlert, setPaymentAlert] = useState("");
    const [badFeedbackAlert, setBadFeedbackAlert] = useState("");

    // Bo loc & Tim kiem
    const [statusFilter, setStatusFilter] = useState("");
    const [tableFilter, setTableFilter] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDate, setSelectedDate] = useState(getLocalToday);

    // Phan trang cho 2 khu vuc
    const [activePage, setActivePage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);

    // Dong ho cap nhat moi 30s de tinh so phut cho (SLA Timer)
    const [nowTick, setNowTick] = useState(Date.now());

    // State cho Modal Huy don, Modal Doi ban, Modal Void/Refund & Modal Xem chi tiet don
    const [cancelModalOrder, setCancelModalOrder] = useState(null);
    const [cancelReason, setCancelReason] = useState("");
    const [changeTableModalOrder, setChangeTableModalOrder] = useState(null);
    const [targetTableCode, setTargetTableCode] = useState("");
    const [changeTableReasonText, setChangeTableReasonText] = useState("");
    const [changingTable, setChangingTable] = useState(false);
    const [voidRefundModalOrder, setVoidRefundModalOrder] = useState(null);
    const [vrActionType, setVrActionType] = useState("void");
    const [vrIncidentCategory, setVrIncidentCategory] = useState("staff");
    const [vrRefundAmount, setVrRefundAmount] = useState(0);
    const [vrReason, setVrReason] = useState("");
    const [processingVoidRefund, setProcessingVoidRefund] = useState(false);
    const [detailModalOrder, setDetailModalOrder] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [settlingTable, setSettlingTable] = useState("");

    useEffect(() => {
        const timer = setInterval(() => {
            setNowTick(Date.now());
        }, 30000);
        return () => clearInterval(timer);
    }, []);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const params = new URLSearchParams();
            if (selectedDate) params.append("date", selectedDate);

            const [res, tableRes] = await Promise.all([
                axiosClient.get(`/orders?${params.toString()}`),
                axiosClient.get("/tables")
            ]);
            setOrders(res.data?.data || res.data || []);
            setTables(tableRes.data || tableRes || []);
        } catch (err) {
            setError(typeof err === "string" ? err : "Không thể tải danh sách đơn hàng!");
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Reset trang ve 1 khi doi bo loc
    useEffect(() => {
        setActivePage(1);
        setHistoryPage(1);
    }, [statusFilter, tableFilter, searchTerm, selectedDate]);

    // Lang nghe Socket realtime: Don moi, Cap nhat trang thai & Khach goi thanh toan
    useEffect(() => {
        const handleNewOrder = (newOrder) => {
            playNotificationSound();
            setRealtimeAlert(
                `Có đơn hàng mới [${newOrder.orderCode}] tại ${toVietnamese(
                    newOrder.tableName
                )} - Khách: ${newOrder.customerName}`
            );
            setTimeout(() => setRealtimeAlert(""), 6000);

            setOrders((prev) => {
                const exists = prev.some((o) => String(o._id) === String(newOrder._id));
                if (exists) return prev;
                return [newOrder, ...prev];
            });
        };

        const handleOrderUpdated = (payload) => {
            setOrders((prev) =>
                prev.map((ord) =>
                    String(ord._id) === String(payload.id)
                        ? {
                              ...ord,
                              tableId: payload.tableId ?? ord.tableId,
                              tableName: payload.tableName ?? ord.tableName,
                              changeTableReason:
                                  payload.changeTableReason ?? ord.changeTableReason,
                              status: payload.status ?? ord.status,
                              paymentRequested:
                                  payload.paymentRequested !== undefined
                                      ? payload.paymentRequested
                                      : ord.paymentRequested,
                              paymentMethod: payload.paymentMethod ?? ord.paymentMethod,
                              cancelReason: payload.cancelReason ?? ord.cancelReason,
                              feedback: payload.feedback !== undefined ? payload.feedback : ord.feedback,
                              voidRefund: payload.voidRefund !== undefined ? payload.voidRefund : ord.voidRefund,
                              updatedAt: payload.updatedAt || ord.updatedAt
                          }
                        : ord
                )
            );
        };

        const handleBadFeedback = (data) => {
            playNotificationSound();
            const catLabel =
                data?.issueCategory === "staff"
                    ? "Lỗi nhân viên"
                    : data?.issueCategory === "ingredient"
                    ? "Lỗi nguyên liệu"
                    : "Lỗi cả nhân viên & nguyên liệu";
            setBadFeedbackAlert(
                `CẢNH BÁO SỰ CỐ: Bàn [${toVietnamese(
                    data?.tableName || ""
                )}] vừa gửi đánh giá ${data?.rating} sao (${catLabel}): "${data?.comment || ""}"`
            );
        };

        const handlePaymentRequested = (data) => {
            playNotificationSound();
            const methodLabel =
                data?.paymentMethod === "transfer" ? "Chuyển khoản" : "Tiền mặt";
            setPaymentAlert(
                `${toVietnamese(
                    data?.tableName || "Bàn khách"
                )} vừa gọi thanh toán (${methodLabel}) - Tổng tạm tính: ${(
                    data?.totalAmount || 0
                ).toLocaleString("vi-VN")} đ`
            );
        };

        const handleTableUpdated = (updatedTable) => {
            if (!updatedTable || !updatedTable._id) return;
            setTables((prev) => {
                const exists = prev.some((t) => String(t._id) === String(updatedTable._id));
                if (exists) {
                    return prev.map((t) =>
                        String(t._id) === String(updatedTable._id) ? updatedTable : t
                    );
                }
                return [...prev, updatedTable].sort((a, b) => a.code.localeCompare(b.code));
            });
        };

        socket.on("order:new", handleNewOrder);
        socket.on("order:updated", handleOrderUpdated);
        socket.on("order:bad_feedback", handleBadFeedback);
        socket.on("order:payment_requested", handlePaymentRequested);
        socket.on("table:updated", handleTableUpdated);

        return () => {
            socket.off("order:new", handleNewOrder);
            socket.off("order:updated", handleOrderUpdated);
            socket.off("order:bad_feedback", handleBadFeedback);
            socket.off("order:payment_requested", handlePaymentRequested);
            socket.off("table:updated", handleTableUpdated);
        };
    }, []);

    // Chuyen trang thai don (confirmed, served, completed, cancelled)
    const handleStatusChange = async (orderId, nextStatus, reason = "") => {
        try {
            setUpdatingId(orderId);
            setError("");
            const res = await axiosClient.patch(`/orders/${orderId}/status`, {
                status: nextStatus,
                cancelReason: reason
            });
            const updatedOrder = res.data?.data || res.data;

            setOrders((prev) =>
                prev.map((ord) => (String(ord._id) === String(orderId) ? updatedOrder : ord))
            );
            setCancelModalOrder(null);
            setCancelReason("");
        } catch (err) {
            setError(typeof err === "string" ? err : "Cập nhật trạng thái đơn thất bại!");
        } finally {
            setUpdatingId(null);
        }
    };

    // Chot thanh toan dong loat tat ca don cua 1 ban
    const handleSettleTable = async (tableName, tableOrderIds) => {
        try {
            setSettlingTable(tableName);
            setError("");
            const res = await axiosClient.post("/orders/settle-table", {
                orderIds: tableOrderIds
            });
            const updatedList = res.data?.data || res.data || [];
            const updatedMap = new Map(updatedList.map((o) => [String(o._id), o]));

            setOrders((prev) =>
                prev.map((ord) => updatedMap.get(String(ord._id)) || ord)
            );
            setPaymentAlert("");
        } catch (err) {
            setError(typeof err === "string" ? err : "Chốt thanh toán cho bàn thất bại!");
        } finally {
            setSettlingTable("");
        }
    };

    const handleToggleTableOccupancy = async (table, nextOccupied) => {
        try {
            const res = await axiosClient.patch(`/tables/${table._id}/occupancy`, {
                isOccupied: nextOccupied
            });
            const updated = res.data || res;
            setTables((prev) =>
                prev.map((t) => (String(t._id) === String(table._id) ? updated : t))
            );
        } catch (err) {
            setError(typeof err === "string" ? err : "Cập nhật trạng thái bàn thất bại!");
        }
    };

    const handleConfirmCancel = (e) => {
        e.preventDefault();
        if (!cancelReason.trim()) {
            setError("Vui lòng nhập lý do hủy đơn!");
            return;
        }
        handleStatusChange(cancelModalOrder._id, "cancelled", cancelReason.trim());
    };

    const handleConfirmChangeTable = async (e) => {
        e.preventDefault();
        if (!changeTableModalOrder || !targetTableCode) {
            setError("Vui lòng chọn bàn trống muốn chuyển đến!");
            return;
        }
        if (!changeTableReasonText.trim()) {
            setError("Vui lòng nhập lý do đổi bàn!");
            return;
        }
        try {
            setChangingTable(true);
            setError("");
            const res = await axiosClient.patch(
                `/orders/${changeTableModalOrder._id}/change-table`,
                {
                    newTableCode: targetTableCode,
                    reason: changeTableReasonText.trim()
                }
            );
            const updatedOrder = res.data?.order || res.order || res.data;
            if (updatedOrder && updatedOrder._id) {
                setOrders((prev) =>
                    prev.map((ord) =>
                        String(ord._id) === String(updatedOrder._id) ? updatedOrder : ord
                    )
                );
            }
            setRealtimeAlert(
                `Đã chuyển đơn [${changeTableModalOrder.orderCode}] sang bàn ${targetTableCode} thành công!`
            );
            setTimeout(() => setRealtimeAlert(""), 5000);
            setChangeTableModalOrder(null);
            setTargetTableCode("");
            setChangeTableReasonText("");
        } catch (err) {
            setError(typeof err === "string" ? err : "Đổi bàn cho đơn hàng thất bại!");
        } finally {
            setChangingTable(false);
        }
    };

    const handleOpenVoidRefund = (order) => {
        setVoidRefundModalOrder(order);
        const defaultAction = ["pending", "confirmed", "served"].includes(order.status)
            ? "void"
            : "full_refund";
        setVrActionType(defaultAction);
        const cat =
            order.feedback?.issueCategory && order.feedback.issueCategory !== "none"
                ? order.feedback.issueCategory
                : "staff";
        setVrIncidentCategory(cat);
        setVrRefundAmount(order.totalAmount || 0);
        setVrReason(order.feedback?.comment ? `Sự cố: ${order.feedback.comment}` : "");
    };

    const handleConfirmVoidRefund = async (e) => {
        e.preventDefault();
        if (!voidRefundModalOrder) return;
        if (!vrReason.trim()) {
            setError("Vui lòng nhập biên bản / lý do xử lý sự cố!");
            return;
        }

        try {
            setProcessingVoidRefund(true);
            setError("");
            const res = await axiosClient.post(
                `/orders/${voidRefundModalOrder._id}/void-refund`,
                {
                    actionType: vrActionType,
                    incidentCategory: vrIncidentCategory,
                    refundAmount: Number(vrRefundAmount),
                    reason: vrReason.trim()
                }
            );
            const updated = res.data?.data || res.data;
            if (updated && updated._id) {
                setOrders((prev) =>
                    prev.map((o) => (String(o._id) === String(updated._id) ? updated : o))
                );
            }
            setRealtimeAlert(res.data?.message || "Đã xử lý sự cố thành công!");
            setTimeout(() => setRealtimeAlert(""), 6000);
            setVoidRefundModalOrder(null);
        } catch (err) {
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                (typeof err === "string" ? err : "Xử lý sự cố thất bại!");
            setError(msg);
        } finally {
            setProcessingVoidRefund(false);
        }
    };

    // Danh sach cac ban co don trong ngay de hien thi dropdown loc ban
    const uniqueTables = useMemo(() => {
        const set = new Set();
        orders.forEach((o) => {
            if (o.tableName) set.add(o.tableName);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
    }, [orders]);

    // Loc theo Ban, Tim kiem va Trang thai
    const filteredOrders = useMemo(() => {
        const kw = searchTerm.trim().toLowerCase();
        return orders.filter((ord) => {
            if (statusFilter && ord.status !== statusFilter) return false;
            if (tableFilter && ord.tableName !== tableFilter) return false;
            if (kw) {
                const codeMatch = (ord.orderCode || "").toLowerCase().includes(kw);
                const nameMatch = (ord.customerName || "").toLowerCase().includes(kw);
                const phoneMatch = (ord.customerPhone || "").toLowerCase().includes(kw);
                const tableMatch = toVietnamese(ord.tableName || "")
                    .toLowerCase()
                    .includes(kw);
                if (!codeMatch && !nameMatch && !phoneMatch && !tableMatch) return false;
            }
            return true;
        });
    }, [orders, statusFilter, tableFilter, searchTerm]);

    // Tach thanh 2 nhom:
    // 1. Don Dang Phuc Vu (pending, confirmed, served) - Sap xep Uu Tien + FIFO (don cho lau nhat len dau)
    const activeOrders = useMemo(() => {
        const list = filteredOrders.filter((o) =>
            ["pending", "confirmed", "served"].includes(o.status)
        );
        list.sort((a, b) => {
            const pA = getActiveOrderPriority(a);
            const pB = getActiveOrderPriority(b);
            if (pA !== pB) return pA - pB;
            // FIFO: Don dat truoc (cho lau hon) nam truoc de khong bao gio bi sot don
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
        return list;
    }, [filteredOrders]);

    // 2. Don Da Dong (completed, cancelled) - Sap xep moi nhat len dau de de tra cuu
    const closedOrders = useMemo(() => {
        const list = filteredOrders.filter((o) =>
            ["completed", "cancelled"].includes(o.status)
        );
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return list;
    }, [filteredOrders]);

    // Thong ke nhanh toan bo ngay
    const pendingCount = orders.filter((o) => o.status === "pending").length;
    const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
    const servedCount = orders.filter((o) => o.status === "served").length;
    const paymentReqCount = orders.filter(
        (o) => o.paymentRequested && ["confirmed", "served"].includes(o.status)
    ).length;
    const overdueCount = orders.filter((o) => {
        if (!["pending", "confirmed"].includes(o.status)) return false;
        const mins = Math.floor((nowTick - new Date(o.createdAt).getTime()) / 60000);
        return mins >= 10;
    }).length;
    const completedRevenue = orders
        .filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalRefunded = orders.reduce((sum, o) => {
        return sum + (o.voidRefund?.isProcessed ? o.voidRefund.refundAmount || 0 : 0);
    }, 0);
    const netRevenue = Math.max(0, completedRevenue - totalRefunded);
    const badFeedbackCount = orders.filter((o) => o.feedback?.isBadFeedback).length;

    // Tinh toan phan trang cho Khu vuc 1 (Don Dang Phuc Vu)
    const totalActivePages = Math.max(1, Math.ceil(activeOrders.length / ACTIVE_PAGE_SIZE));
    const safeActivePage = Math.min(activePage, totalActivePages);
    const pagedActiveOrders = activeOrders.slice(
        (safeActivePage - 1) * ACTIVE_PAGE_SIZE,
        safeActivePage * ACTIVE_PAGE_SIZE
    );

    // Tinh toan phan trang cho Khu vuc 2 (Lich Su Don Da Dong)
    const totalHistoryPages = Math.max(1, Math.ceil(closedOrders.length / HISTORY_PAGE_SIZE));
    const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
    const pagedClosedOrders = closedOrders.slice(
        (safeHistoryPage - 1) * HISTORY_PAGE_SIZE,
        safeHistoryPage * HISTORY_PAGE_SIZE
    );

    const getWaitInfo = (order) => {
        const mins = Math.max(
            0,
            Math.floor((nowTick - new Date(order.createdAt).getTime()) / 60000)
        );
        if (["pending", "confirmed"].includes(order.status)) {
            if (mins >= 10) {
                return {
                    mins,
                    isOverdue: true,
                    bg: "danger",
                    text: "white",
                    label: `TRỄ ${mins} PHÚT - CẦN XỬ LÝ NGAY`
                };
            }
            if (mins >= 5) {
                return {
                    mins,
                    isOverdue: false,
                    bg: "warning",
                    text: "dark",
                    label: `Chờ ${mins} phút (Sắp trễ)`
                };
            }
            return {
                mins,
                isOverdue: false,
                bg: "light",
                text: "dark",
                label: mins === 0 ? "Vừa đặt" : `Đã chờ ${mins} phút`
            };
        }
        return {
            mins,
            isOverdue: false,
            bg: "light",
            text: "muted",
            label: `Bàn ngồi ${mins} phút`
        };
    };

    const showActiveSection =
        statusFilter === "" || ["pending", "confirmed", "served"].includes(statusFilter);
    const showClosedSection =
        statusFilter === "" || ["completed", "cancelled"].includes(statusFilter);

    return (
        <div>
            {/* Thanh canh bao ghim co dinh chong sot don */}
            {(paymentReqCount > 0 || overdueCount > 0) && (
                <Alert variant="danger" className="shadow-sm border-danger py-2 mb-3">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <div className="fw-bold small">
                            [CẢNH BÁO CHỐNG SÓT ĐƠN]{" "}
                            {paymentReqCount > 0 && (
                                <span className="me-3">
                                    Có {paymentReqCount} đơn KHÁCH ĐANG GỌI THANH TOÁN!
                                </span>
                            )}
                            {overdueCount > 0 && (
                                <span>
                                    Có {overdueCount} đơn Bếp chờ quá 10 phút chưa lên món!
                                </span>
                            )}
                        </div>
                        <Button
                            variant="outline-danger"
                            size="sm"
                            className="fw-bold py-0"
                            onClick={() => {
                                setStatusFilter("");
                                setTableFilter("");
                                setSearchTerm("");
                                setActivePage(1);
                            }}
                        >
                            Xem Ngay Các Đơn Khẩn
                        </Button>
                    </div>
                </Alert>
            )}

            {badFeedbackAlert && (
                <Alert
                    variant="danger"
                    className="fw-bold shadow-sm border-danger"
                    dismissible
                    onClose={() => setBadFeedbackAlert("")}
                >
                    [CẢNH BÁO SỰ CỐ TỪ KHÁCH HÀNG] {badFeedbackAlert}
                </Alert>
            )}

            {paymentAlert && (
                <Alert
                    variant="warning"
                    className="fw-bold shadow-sm border-warning"
                    dismissible
                    onClose={() => setPaymentAlert("")}
                >
                    [YÊU CẦU THANH TOÁN] {paymentAlert}
                </Alert>
            )}

            {realtimeAlert && (
                <Alert
                    variant="success"
                    className="fw-bold shadow-sm border-success"
                    dismissible
                    onClose={() => setRealtimeAlert("")}
                >
                    [THÔNG BÁO REALTIME] {realtimeAlert}
                </Alert>
            )}

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError("")}>
                    {error}
                </Alert>
            )}

            {/* 4 O Thong ke nhanh (Bam vao de loc nhanh 1 cham) */}
            <Row className="g-3 mb-4">
                <Col sm={6} md={3}>
                    <Card
                        className={`border-0 shadow-sm h-100 border-start border-4 border-warning ${
                            statusFilter === "pending" ? "bg-warning-subtle" : ""
                        }`}
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                            setStatusFilter((prev) => (prev === "pending" ? "" : "pending"))
                        }
                    >
                        <Card.Body className="py-3">
                            <div className="text-muted small">Chờ Xác Nhận (Click để lọc)</div>
                            <div className="fs-4 fw-bold text-warning">{pendingCount}</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col sm={6} md={3}>
                    <Card
                        className={`border-0 shadow-sm h-100 border-start border-4 border-primary ${
                            statusFilter === "confirmed" ? "bg-primary-subtle" : ""
                        }`}
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                            setStatusFilter((prev) => (prev === "confirmed" ? "" : "confirmed"))
                        }
                    >
                        <Card.Body className="py-3">
                            <div className="text-muted small">Bếp Đang Làm (Click để lọc)</div>
                            <div className="fs-4 fw-bold text-primary">{confirmedCount}</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col sm={6} md={3}>
                    <Card
                        className={`border-0 shadow-sm h-100 border-start border-4 border-info ${
                            statusFilter === "served" ? "bg-info-subtle" : ""
                        }`}
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                            setStatusFilter((prev) => (prev === "served" ? "" : "served"))
                        }
                    >
                        <Card.Body className="py-3">
                            <div className="text-muted small">Đã Phục Vụ / Chờ Thu Tiền</div>
                            <div className="fs-4 fw-bold text-info">
                                {servedCount}
                                {paymentReqCount > 0 && (
                                    <Badge bg="warning" text="dark" className="ms-2 fs-6">
                                        {paymentReqCount} gọi tính tiền
                                    </Badge>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col sm={6} md={3}>
                    <Card
                        className={`border-0 shadow-sm h-100 border-start border-4 border-success ${
                            statusFilter === "completed" ? "bg-success-subtle" : ""
                        }`}
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                            setStatusFilter((prev) => (prev === "completed" ? "" : "completed"))
                        }
                    >
                        <Card.Body className="py-3">
                            <div className="d-flex justify-content-between align-items-center">
                                <div className="text-muted small">Doanh Thu Thực Thu</div>
                                {totalRefunded > 0 && (
                                    <Badge bg="danger" className="small">
                                        Hoàn tiền: -{totalRefunded.toLocaleString("vi-VN")} đ
                                    </Badge>
                                )}
                            </div>
                            <div className="fs-4 fw-bold text-success">
                                {netRevenue.toLocaleString("vi-VN")} đ
                            </div>
                            {totalRefunded > 0 && (
                                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                    Tổng thu gốc: {completedRevenue.toLocaleString("vi-VN")} đ
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* So do trang thai ban thuc te: Phan biet Ban Trong / Dang Phuc Vu / Da Thanh Toan nhung Khach Chua Roi Ban */}
            {tables.length > 0 && (
                <Card className="border-0 shadow-sm mb-3">
                    <Card.Body className="py-2 px-3">
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                            <span className="fw-bold small text-dark">
                                Trạng Thái Bàn Thực Tế (Bấm &quot;Làm Trống&quot; khi khách đã rời bàn):
                            </span>
                            <div className="d-flex flex-wrap gap-3 small">
                                <span className="text-success fw-semibold">
                                    Bàn trống: {tables.filter((t) => t.isActive && !t.isOccupied).length}
                                </span>
                                <span className="text-danger fw-semibold">
                                    Đang có khách: {tables.filter((t) => t.isActive && t.isOccupied).length}
                                </span>
                            </div>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            {tables
                                .filter((t) => t.isActive)
                                .map((t) => {
                                    const hasUnpaid = orders.some(
                                        (o) =>
                                            o.tableName === t.name &&
                                            ["pending", "confirmed", "served"].includes(o.status)
                                    );
                                    const isPaidWaitingLeave = t.isOccupied && !hasUnpaid;

                                    return (
                                        <div
                                            key={t._id}
                                            className={`d-inline-flex align-items-center gap-2 px-2 py-1 rounded border small ${
                                                !t.isOccupied
                                                    ? "bg-success-subtle border-success text-success"
                                                    : isPaidWaitingLeave
                                                      ? "bg-warning-subtle border-warning text-dark"
                                                      : "bg-danger-subtle border-danger text-danger"
                                            }`}
                                        >
                                            <span className="fw-bold">
                                                {toVietnamese(t.name)} ({t.code}):
                                            </span>
                                            <span>
                                                {!t.isOccupied
                                                    ? "Trống"
                                                    : isPaidWaitingLeave
                                                      ? "Đã TT - Khách chưa rời bàn"
                                                      : "Đang phục vụ"}
                                            </span>
                                            {t.isOccupied && (
                                                <Button
                                                    variant={isPaidWaitingLeave ? "dark" : "outline-danger"}
                                                    size="sm"
                                                    className="py-0 px-2 fw-bold"
                                                    style={{ fontSize: "0.72rem" }}
                                                    onClick={() => handleToggleTableOccupancy(t, false)}
                                                >
                                                    Làm Trống
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* Thanh cong cu: Bo loc trang thai + Loc theo Ban + Tim kiem + Chon ngay */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="d-flex flex-column gap-3">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <ButtonGroup className="flex-wrap">
                            <Button
                                variant={statusFilter === "" ? "dark" : "outline-dark"}
                                size="sm"
                                onClick={() => setStatusFilter("")}
                            >
                                Tất Cả ({orders.length})
                            </Button>
                            <Button
                                variant={
                                    statusFilter === "pending" ? "warning" : "outline-secondary"
                                }
                                size="sm"
                                onClick={() => setStatusFilter("pending")}
                            >
                                Chờ Xác Nhận ({pendingCount})
                            </Button>
                            <Button
                                variant={
                                    statusFilter === "confirmed" ? "primary" : "outline-secondary"
                                }
                                size="sm"
                                onClick={() => setStatusFilter("confirmed")}
                            >
                                Đang Chuẩn Bị ({confirmedCount})
                            </Button>
                            <Button
                                variant={statusFilter === "served" ? "info" : "outline-secondary"}
                                size="sm"
                                onClick={() => setStatusFilter("served")}
                            >
                                Đã Phục Vụ ({servedCount})
                            </Button>
                            <Button
                                variant={
                                    statusFilter === "completed" ? "success" : "outline-secondary"
                                }
                                size="sm"
                                onClick={() => setStatusFilter("completed")}
                            >
                                Đã Thanh Toán
                            </Button>
                            <Button
                                variant={
                                    statusFilter === "cancelled" ? "danger" : "outline-secondary"
                                }
                                size="sm"
                                onClick={() => setStatusFilter("cancelled")}
                            >
                                Đã Hủy
                            </Button>
                        </ButtonGroup>

                        <div className="d-flex align-items-center gap-2">
                            <Form.Label className="mb-0 small text-muted text-nowrap">
                                Ngày:
                            </Form.Label>
                            <Form.Control
                                type="date"
                                size="sm"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ width: 150 }}
                            />
                            <Button variant="outline-primary" size="sm" onClick={fetchOrders}>
                                Làm Mới
                            </Button>
                        </div>
                    </div>

                    <div className="d-flex flex-wrap align-items-center gap-2 pt-2 border-top">
                        <Form.Select
                            size="sm"
                            style={{ width: 180 }}
                            value={tableFilter}
                            onChange={(e) => setTableFilter(e.target.value)}
                        >
                            <option value="">-- Tất cả các bàn --</option>
                            {uniqueTables.map((tb) => (
                                <option key={tb} value={tb}>
                                    {toVietnamese(tb)}
                                </option>
                            ))}
                        </Form.Select>

                        <Form.Control
                            type="text"
                            size="sm"
                            placeholder="Tìm kiếm theo mã đơn, tên khách hoặc số điện thoại..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-grow-1"
                            style={{ maxWidth: 420 }}
                        />

                        {(statusFilter || tableFilter || searchTerm) && (
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => {
                                    setStatusFilter("");
                                    setTableFilter("");
                                    setSearchTerm("");
                                }}
                            >
                                Xóa Bộ Lọc
                            </Button>
                        )}
                    </div>
                </Card.Body>
            </Card>

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted">Đang tải danh sách đơn hàng...</p>
                </div>
            ) : (
                <>
                    {/* KHU VUC 1: DON DANG PHUC VU (DANG CARD TRUC QUAN + UU TIEN FIFO CHONG SOT DON) */}
                    {showActiveSection && (
                        <div className="mb-5">
                            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                                <div>
                                    <h5 className="fw-bold mb-0">
                                        1. Đơn Đang Phục Vụ ({activeOrders.length} đơn)
                                    </h5>
                                    <div className="text-muted small">
                                        Tự động ưu tiên: Đơn gọi thanh toán &rarr; Đơn chờ xác nhận
                                        &rarr; Đơn chờ lâu nhất lên đầu (FIFO chống sót đơn)
                                    </div>
                                </div>
                                {totalActivePages > 1 && (
                                    <span className="small text-muted fw-semibold">
                                        Trang {safeActivePage} / {totalActivePages}
                                    </span>
                                )}
                            </div>

                            {activeOrders.length === 0 ? (
                                <Card className="border-0 shadow-sm text-center py-4">
                                    <Card.Body>
                                        <div className="text-muted fw-semibold">
                                            Hiện không có đơn nào đang chờ xử lý hoặc đang phục vụ.
                                        </div>
                                    </Card.Body>
                                </Card>
                            ) : (
                                <>
                                    <Row className="g-3">
                                        {pagedActiveOrders.map((order) => {
                                            const badgeInfo = STATUS_BADGE[order.status] || {
                                                label: order.status,
                                                bg: "secondary",
                                                text: "white"
                                            };
                                            const isUpdating = updatingId === order._id;
                                            const waitInfo = getWaitInfo(order);

                                            // Tim tat ca cac don chua thanh toan (confirmed / served) cua cung ban
                                            const sameTableUnpaid = orders.filter(
                                                (o) =>
                                                    o.tableName === order.tableName &&
                                                    ["confirmed", "served"].includes(o.status)
                                            );
                                            const sameTableTotal = sameTableUnpaid.reduce(
                                                (sum, o) => sum + (o.totalAmount || 0),
                                                0
                                            );

                                            let cardBorderClass = "border-0";
                                            if (
                                                order.feedback?.isBadFeedback &&
                                                !order.voidRefund?.isProcessed
                                            ) {
                                                cardBorderClass = "border-danger border-3";
                                            } else if (
                                                order.paymentRequested &&
                                                ["confirmed", "served"].includes(order.status)
                                            ) {
                                                cardBorderClass = "border-warning border-2";
                                            } else if (waitInfo.isOverdue) {
                                                cardBorderClass = "border-danger border-2";
                                            }

                                            return (
                                                <Col key={order._id} md={6} lg={4}>
                                                    <Card
                                                        className={`h-100 shadow-sm ${cardBorderClass}`}
                                                    >
                                                        <Card.Header className="bg-white d-flex justify-content-between align-items-center py-2">
                                                            <div className="d-flex align-items-center flex-wrap gap-1">
                                                                <span className="fw-bold text-primary fs-6">
                                                                    {order.orderCode}
                                                                </span>
                                                                <Badge bg="dark" className="ms-1">
                                                                    {toVietnamese(order.tableName)}
                                                                </Badge>
                                                                <Button
                                                                    variant="outline-primary"
                                                                    size="sm"
                                                                    className="py-0 px-2 fw-semibold ms-1"
                                                                    style={{ fontSize: "0.72rem" }}
                                                                    onClick={() => {
                                                                        setChangeTableModalOrder(order);
                                                                        setTargetTableCode("");
                                                                        setChangeTableReasonText("");
                                                                    }}
                                                                >
                                                                    Đổi Bàn
                                                                </Button>
                                                            </div>
                                                            <Badge
                                                                bg={badgeInfo.bg}
                                                                text={badgeInfo.text}
                                                            >
                                                                {badgeInfo.label}
                                                            </Badge>
                                                        </Card.Header>

                                                        <Card.Body className="d-flex flex-column py-3">
                                                            {/* Nhan dong ho SLA chong sot don */}
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <span className="small text-muted">
                                                                    Giờ đặt:{" "}
                                                                    {new Date(
                                                                        order.createdAt
                                                                    ).toLocaleTimeString("vi-VN")}
                                                                </span>
                                                                <Badge
                                                                    bg={waitInfo.bg}
                                                                    text={waitInfo.text}
                                                                    className="border"
                                                                >
                                                                    {waitInfo.label}
                                                                </Badge>
                                                            </div>

                                                            {order.paymentRequested &&
                                                                ["confirmed", "served"].includes(
                                                                    order.status
                                                                ) && (
                                                                    <div className="bg-warning text-dark fw-bold small px-2 py-1 rounded mb-2 text-center">
                                                                        KHÁCH GỌI THANH TOÁN (
                                                                        {order.paymentMethod ===
                                                                        "transfer"
                                                                            ? "CHUYỂN KHOẢN"
                                                                            : "TIỀN MẶT"}
                                                                        )
                                                                    </div>
                                                                )}

                                                            {order.feedback?.isBadFeedback && (
                                                                <div className="bg-danger text-white fw-bold small p-2 rounded mb-2">
                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                        <span>SỰ CỐ: {order.feedback.rating} Sao ({order.feedback.issueCategory === "staff" ? "Lỗi nhân viên" : order.feedback.issueCategory === "ingredient" ? "Lỗi nguyên liệu" : "Lỗi cả 2"})</span>
                                                                        <Button
                                                                            variant="light"
                                                                            size="sm"
                                                                            className="py-0 px-2 fw-bold text-danger"
                                                                            style={{ fontSize: "0.75rem" }}
                                                                            onClick={() => handleOpenVoidRefund(order)}
                                                                        >
                                                                            Void / Hoàn Tiền
                                                                        </Button>
                                                                    </div>
                                                                    {order.feedback.comment && (
                                                                        <div className="fst-italic mt-1 text-white-50">
                                                                            "{order.feedback.comment}"
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {order.voidRefund && order.voidRefund.isProcessed && (
                                                                <div className="bg-warning-subtle text-dark border border-warning rounded p-2 small mb-2">
                                                                    <strong>Đã xử lý {order.voidRefund.actionType === "void" ? "Void (Miễn thu)" : "Hoàn tiền"}:</strong> {order.voidRefund.reason}
                                                                </div>
                                                            )}

                                                            <div className="small mb-2 text-muted">
                                                                <div>
                                                                    <strong>Khách:</strong>{" "}
                                                                    {toVietnamese(order.customerName)}
                                                                    {order.customerPhone
                                                                        ? ` (${order.customerPhone})`
                                                                        : ""}
                                                                </div>
                                                                {order.changeTableReason && (
                                                                    <div className="text-primary fw-semibold mt-1">
                                                                        Đổi bàn: {toVietnamese(order.changeTableReason)}
                                                                    </div>
                                                                )}
                                                                {order.note && (
                                                                    <div className="text-danger fw-semibold mt-1">
                                                                        Ghi chú: {order.note}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div
                                                                className="mb-3"
                                                                style={{
                                                                    maxHeight: 175,
                                                                    overflowY: "auto"
                                                                }}
                                                            >
                                                                <Table
                                                                    size="sm"
                                                                    className="small mb-0 align-middle"
                                                                >
                                                                    <thead className="table-light">
                                                                        <tr>
                                                                            <th>Tên món</th>
                                                                            <th className="text-center">
                                                                                SL
                                                                            </th>
                                                                            <th className="text-end">
                                                                                Giá
                                                                            </th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {order.items.map(
                                                                            (item, idx) => (
                                                                                <tr key={idx}>
                                                                                    <td>
                                                                                        <span className="fw-semibold">
                                                                                            {toVietnamese(
                                                                                                item.name
                                                                                            )}
                                                                                        </span>
                                                                                        {item.selectedOption && (
                                                                                            <Badge
                                                                                                bg={
                                                                                                    item.selectedOption ===
                                                                                                        "Đặc biệt" ||
                                                                                                    item.selectedOption.includes(
                                                                                                        "XL"
                                                                                                    )
                                                                                                        ? "danger"
                                                                                                        : "info"
                                                                                                }
                                                                                                text={
                                                                                                    item.selectedOption ===
                                                                                                        "Đặc biệt" ||
                                                                                                    item.selectedOption.includes(
                                                                                                        "XL"
                                                                                                    )
                                                                                                        ? "white"
                                                                                                        : "dark"
                                                                                                }
                                                                                                className="ms-1 fw-bold"
                                                                                                style={{
                                                                                                    fontSize:
                                                                                                        "0.7rem"
                                                                                                }}
                                                                                            >
                                                                                                {
                                                                                                    item.selectedOption
                                                                                                }
                                                                                            </Badge>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="text-center fw-bold">
                                                                                        x
                                                                                        {
                                                                                            item.quantity
                                                                                        }
                                                                                    </td>
                                                                                    <td className="text-end">
                                                                                        {(
                                                                                            item.price *
                                                                                            item.quantity
                                                                                        ).toLocaleString(
                                                                                            "vi-VN"
                                                                                        )}{" "}
                                                                                        đ
                                                                                    </td>
                                                                                </tr>
                                                                            )
                                                                        )}
                                                                    </tbody>
                                                                </Table>
                                                            </div>

                                                            <div className="mt-auto pt-2 border-top">
                                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                                    <span className="small text-muted">
                                                                        Tổng đơn:
                                                                    </span>
                                                                    <strong className="text-danger fs-5">
                                                                        {order.totalAmount.toLocaleString(
                                                                            "vi-VN"
                                                                        )}{" "}
                                                                        đ
                                                                    </strong>
                                                                </div>

                                                                {/* 1. Don dang Cho Xac Nhan (pending) */}
                                                                {order.status === "pending" && (
                                                                    <div className="d-flex gap-2">
                                                                        <Button
                                                                            variant="primary"
                                                                            size="sm"
                                                                            className="flex-grow-1 fw-bold"
                                                                            disabled={isUpdating}
                                                                            onClick={() =>
                                                                                handleStatusChange(
                                                                                    order._id,
                                                                                    "confirmed"
                                                                                )
                                                                            }
                                                                        >
                                                                            Xác Nhận Đơn
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline-danger"
                                                                            size="sm"
                                                                            disabled={isUpdating}
                                                                            onClick={() => {
                                                                                setCancelModalOrder(
                                                                                    order
                                                                                );
                                                                                setCancelReason("");
                                                                            }}
                                                                        >
                                                                            Hủy Đơn
                                                                        </Button>
                                                                    </div>
                                                                )}

                                                                {/* 2. Don Bep Dang Lam (confirmed) */}
                                                                {order.status === "confirmed" && (
                                                                    <div className="d-flex flex-column gap-2">
                                                                        <div className="d-flex gap-2">
                                                                            <Button
                                                                                variant="info"
                                                                                size="sm"
                                                                                className="flex-grow-1 fw-bold text-dark"
                                                                                disabled={
                                                                                    isUpdating
                                                                                }
                                                                                onClick={() =>
                                                                                    handleStatusChange(
                                                                                        order._id,
                                                                                        "served"
                                                                                    )
                                                                                }
                                                                            >
                                                                                Đã Phục Vụ (Giao
                                                                                Món)
                                                                            </Button>
                                                                            <Button
                                                                                variant="outline-danger"
                                                                                size="sm"
                                                                                disabled={
                                                                                    isUpdating
                                                                                }
                                                                                onClick={() => {
                                                                                    setCancelModalOrder(
                                                                                        order
                                                                                    );
                                                                                    setCancelReason(
                                                                                        ""
                                                                                    );
                                                                                }}
                                                                            >
                                                                                Hủy Đơn
                                                                            </Button>
                                                                        </div>
                                                                        <Button
                                                                            variant="outline-warning"
                                                                            size="sm"
                                                                            className="w-100 fw-semibold"
                                                                            onClick={() => handleOpenVoidRefund(order)}
                                                                        >
                                                                            Xử Lý Sự Cố (Void / Miễn Thu)
                                                                        </Button>
                                                                        {order.paymentRequested && (
                                                                            <Button
                                                                                variant="success"
                                                                                size="sm"
                                                                                className="w-100 fw-bold"
                                                                                disabled={
                                                                                    isUpdating
                                                                                }
                                                                                onClick={() =>
                                                                                    handleStatusChange(
                                                                                        order._id,
                                                                                        "completed"
                                                                                    )
                                                                                }
                                                                            >
                                                                                Xác Nhận Đã Thanh
                                                                                Toán Đơn Này
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* 3. Don Da Phuc Vu - Cho Thu Tien (served) */}
                                                                {order.status === "served" && (
                                                                    <div className="d-flex flex-column gap-2">
                                                                        <div className="d-flex gap-2">
                                                                            <Button
                                                                                variant="success"
                                                                                size="sm"
                                                                                className="flex-grow-1 fw-bold"
                                                                                disabled={
                                                                                    isUpdating
                                                                                }
                                                                                onClick={() =>
                                                                                    handleStatusChange(
                                                                                        order._id,
                                                                                        "completed"
                                                                                    )
                                                                                }
                                                                            >
                                                                                Xác Nhận Đã Thanh
                                                                                Toán
                                                                            </Button>
                                                                            <Button
                                                                                variant="outline-danger"
                                                                                size="sm"
                                                                                disabled={
                                                                                    isUpdating
                                                                                }
                                                                                onClick={() => {
                                                                                    setCancelModalOrder(
                                                                                        order
                                                                                    );
                                                                                    setCancelReason(
                                                                                        ""
                                                                                    );
                                                                                }}
                                                                            >
                                                                                Hủy
                                                                            </Button>
                                                                        </div>
                                                                        <Button
                                                                            variant="outline-warning"
                                                                            size="sm"
                                                                            className="w-100 fw-semibold"
                                                                            onClick={() => handleOpenVoidRefund(order)}
                                                                        >
                                                                            Void / Miễn Thu Sự Cố
                                                                        </Button>

                                                                        {sameTableUnpaid.length >
                                                                            1 && (
                                                                            <Button
                                                                                variant="outline-success"
                                                                                size="sm"
                                                                                className="w-100 fw-bold"
                                                                                disabled={
                                                                                    settlingTable ===
                                                                                    order.tableName
                                                                                }
                                                                                onClick={() =>
                                                                                    handleSettleTable(
                                                                                        order.tableName,
                                                                                        sameTableUnpaid.map(
                                                                                            (o) =>
                                                                                                o._id
                                                                                        )
                                                                                    )
                                                                                }
                                                                            >
                                                                                Chốt Thanh Toán Cả{" "}
                                                                                {toVietnamese(
                                                                                    order.tableName
                                                                                )}{" "}
                                                                                (
                                                                                {
                                                                                    sameTableUnpaid.length
                                                                                }{" "}
                                                                                đơn -{" "}
                                                                                {sameTableTotal.toLocaleString(
                                                                                    "vi-VN"
                                                                                )}{" "}
                                                                                đ)
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                            );
                                        })}
                                    </Row>

                                    {totalActivePages > 1 && (
                                        <div className="d-flex justify-content-center mt-3">
                                            <Pagination size="sm" className="mb-0">
                                                <Pagination.Prev
                                                    disabled={safeActivePage <= 1}
                                                    onClick={() =>
                                                        setActivePage((p) => Math.max(1, p - 1))
                                                    }
                                                >
                                                    Trước
                                                </Pagination.Prev>
                                                {Array.from(
                                                    { length: totalActivePages },
                                                    (_, i) => i + 1
                                                ).map((pageNum) => (
                                                    <Pagination.Item
                                                        key={pageNum}
                                                        active={pageNum === safeActivePage}
                                                        onClick={() => setActivePage(pageNum)}
                                                    >
                                                        {pageNum}
                                                    </Pagination.Item>
                                                ))}
                                                <Pagination.Next
                                                    disabled={safeActivePage >= totalActivePages}
                                                    onClick={() =>
                                                        setActivePage((p) =>
                                                            Math.min(totalActivePages, p + 1)
                                                        )
                                                    }
                                                >
                                                    Sau
                                                </Pagination.Next>
                                            </Pagination>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* KHU VUC 2: DON DA DONG (DA THANH TOAN / DA HUY - HIEN THI DANG BANG GON + PHAN TRANG 10 DONG) */}
                    {showClosedSection && (
                        <div>
                            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                                <div>
                                    <h5 className="fw-bold mb-0">
                                        2. Lịch Sử Đơn Đã Đóng ({closedOrders.length} đơn)
                                    </h5>
                                    <div className="text-muted small">
                                        Gồm các đơn Đã thanh toán và Đã hủy trong ngày (Hiển thị
                                        dạng bảng gọn, 10 đơn/trang)
                                    </div>
                                </div>
                                {closedOrders.length > 0 && (
                                    <span className="small text-muted">
                                        Hiển thị{" "}
                                        {(safeHistoryPage - 1) * HISTORY_PAGE_SIZE + 1} -{" "}
                                        {Math.min(
                                            safeHistoryPage * HISTORY_PAGE_SIZE,
                                            closedOrders.length
                                        )}{" "}
                                        trên tổng {closedOrders.length} đơn
                                    </span>
                                )}
                            </div>

                            <Card className="border-0 shadow-sm">
                                <Card.Body className="p-0">
                                    {closedOrders.length === 0 ? (
                                        <div className="text-center py-4 text-muted">
                                            Chưa có đơn hàng nào đã đóng trong danh sách lọc.
                                        </div>
                                    ) : (
                                        <Table
                                            responsive
                                            hover
                                            className="align-middle mb-0 small"
                                        >
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="ps-3">Mã Đơn</th>
                                                    <th>Bàn</th>
                                                    <th>Khách Hàng</th>
                                                    <th>Giờ Đặt</th>
                                                    <th>Món Đã Gọi</th>
                                                    <th className="text-end">Tổng Tiền</th>
                                                    <th className="text-center">Trạng Thái</th>
                                                    <th className="text-end pe-3">Thao Tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagedClosedOrders.map((ord) => {
                                                    const badgeInfo = STATUS_BADGE[ord.status] || {
                                                        label: ord.status,
                                                        bg: "secondary",
                                                        text: "white"
                                                    };
                                                    const summaryText = (ord.items || [])
                                                        .map(
                                                            (i) =>
                                                                `${toVietnamese(i.name)}${
                                                                    i.selectedOption
                                                                        ? ` [${i.selectedOption}]`
                                                                        : ""
                                                                } (x${i.quantity})`
                                                        )
                                                        .join(", ");

                                                    return (
                                                        <tr key={ord._id}>
                                                            <td className="ps-3 fw-bold text-primary">
                                                                {ord.orderCode}
                                                            </td>
                                                            <td>
                                                                <Badge bg="dark">
                                                                    {toVietnamese(ord.tableName)}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                <div className="fw-semibold">
                                                                    {ord.customerName}
                                                                </div>
                                                                <div className="text-muted">
                                                                    {ord.customerPhone}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                {new Date(
                                                                    ord.createdAt
                                                                ).toLocaleTimeString("vi-VN")}
                                                            </td>
                                                            <td style={{ maxWidth: 320 }}>
                                                                <div className="text-truncate">
                                                                    {summaryText}
                                                                </div>
                                                                {ord.feedback?.rating && (
                                                                    <div className={ord.feedback.isBadFeedback ? "text-danger fw-semibold" : "text-success fw-semibold"}>
                                                                        Đánh giá: {ord.feedback.rating} Sao
                                                                        {ord.feedback.issueCategory !== "none" && ` (${ord.feedback.issueCategory === "staff" ? "Lỗi nhân viên" : ord.feedback.issueCategory === "ingredient" ? "Lỗi nguyên liệu" : "Lỗi cả 2"})`}
                                                                    </div>
                                                                )}
                                                                {ord.voidRefund && ord.voidRefund.isProcessed && (
                                                                    <div className="text-warning-emphasis fw-semibold">
                                                                        {ord.voidRefund.actionType === "void" ? "[VOID MIỄN THU]" : "[HOÀN TIỀN]"}: {ord.voidRefund.reason}
                                                                    </div>
                                                                )}
                                                                {ord.status === "cancelled" &&
                                                                    ord.cancelReason && (
                                                                        <div className="text-danger">
                                                                            Lý do hủy:{" "}
                                                                            {ord.cancelReason}
                                                                        </div>
                                                                    )}
                                                            </td>
                                                            <td className="text-end fw-bold text-danger">
                                                                {(
                                                                    ord.totalAmount || 0
                                                                ).toLocaleString("vi-VN")}{" "}
                                                                đ
                                                                {ord.voidRefund && ord.voidRefund.isProcessed && ord.voidRefund.refundAmount > 0 && (
                                                                    <div className="text-success small fw-semibold">
                                                                        Hoàn: -{ord.voidRefund.refundAmount.toLocaleString("vi-VN")} đ
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="text-center">
                                                                <Badge
                                                                    bg={badgeInfo.bg}
                                                                    text={badgeInfo.text}
                                                                >
                                                                    {badgeInfo.label}
                                                                </Badge>
                                                            </td>
                                                            <td className="text-end pe-3 text-nowrap">
                                                                <Button
                                                                    variant="outline-secondary"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        setDetailModalOrder(ord)
                                                                    }
                                                                >
                                                                    Chi Tiết
                                                                </Button>
                                                                {ord.status === "completed" && (
                                                                    ord.voidRefund && ord.voidRefund.isProcessed ? (
                                                                        <Badge bg="warning" text="dark" className="ms-1">
                                                                            Đã Hoàn Tiền
                                                                        </Badge>
                                                                    ) : (
                                                                        <Button
                                                                            variant="outline-warning"
                                                                            size="sm"
                                                                            className="ms-1 fw-semibold"
                                                                            onClick={() => handleOpenVoidRefund(ord)}
                                                                        >
                                                                            Hoàn Tiền
                                                                        </Button>
                                                                    )
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </Table>
                                    )}
                                </Card.Body>

                                {totalHistoryPages > 1 && (
                                    <Card.Footer className="bg-white border-top d-flex justify-content-center py-2">
                                        <Pagination size="sm" className="mb-0">
                                            <Pagination.Prev
                                                disabled={safeHistoryPage <= 1}
                                                onClick={() =>
                                                    setHistoryPage((p) => Math.max(1, p - 1))
                                                }
                                            >
                                                Trước
                                            </Pagination.Prev>
                                            {Array.from(
                                                { length: totalHistoryPages },
                                                (_, i) => i + 1
                                            ).map((pageNum) => (
                                                <Pagination.Item
                                                    key={pageNum}
                                                    active={pageNum === safeHistoryPage}
                                                    onClick={() => setHistoryPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </Pagination.Item>
                                            ))}
                                            <Pagination.Next
                                                disabled={safeHistoryPage >= totalHistoryPages}
                                                onClick={() =>
                                                    setHistoryPage((p) =>
                                                        Math.min(totalHistoryPages, p + 1)
                                                    )
                                                }
                                            >
                                                Sau
                                            </Pagination.Next>
                                        </Pagination>
                                    </Card.Footer>
                                )}
                            </Card>
                        </div>
                    )}
                </>
            )}

            {/* Modal xem chi tiet don da dong */}
            <Modal
                show={Boolean(detailModalOrder)}
                onHide={() => setDetailModalOrder(null)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title className="fs-5 fw-bold">
                        Chi Tiết Đơn Hàng {detailModalOrder?.orderCode}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {detailModalOrder && (
                        <>
                            <div className="bg-light p-3 rounded mb-3 small">
                                <div className="d-flex justify-content-between mb-1">
                                    <span>
                                        <strong>Bàn:</strong>{" "}
                                        {toVietnamese(detailModalOrder.tableName)}
                                    </span>
                                    <Badge
                                        bg={
                                            STATUS_BADGE[detailModalOrder.status]?.bg || "secondary"
                                        }
                                    >
                                        {STATUS_BADGE[detailModalOrder.status]?.label ||
                                            detailModalOrder.status}
                                    </Badge>
                                </div>
                                <div>
                                    <strong>Khách hàng:</strong>{" "}
                                    {toVietnamese(detailModalOrder.customerName)}
                                    {detailModalOrder.customerPhone
                                        ? ` (${detailModalOrder.customerPhone})`
                                        : ""}
                                </div>
                                <div>
                                    <strong>Thời gian đặt:</strong>{" "}
                                    {new Date(detailModalOrder.createdAt).toLocaleString("vi-VN")}
                                </div>
                                {detailModalOrder.changeTableReason && (
                                    <div className="text-primary fw-semibold mt-1">
                                        <strong>Lịch sử đổi bàn:</strong>{" "}
                                        {toVietnamese(detailModalOrder.changeTableReason)}
                                    </div>
                                )}
                                {detailModalOrder.note && (
                                    <div className="text-danger mt-1">
                                        <strong>Ghi chú:</strong> {detailModalOrder.note}
                                    </div>
                                )}
                                {detailModalOrder.status === "cancelled" &&
                                    detailModalOrder.cancelReason && (
                                        <div className="text-danger mt-1">
                                            <strong>Lý do hủy:</strong>{" "}
                                            {detailModalOrder.cancelReason}
                                        </div>
                                    )}
                                {detailModalOrder.feedback?.rating && (
                                    <div className={`mt-2 p-2 rounded border small ${detailModalOrder.feedback.isBadFeedback ? "bg-danger-subtle border-danger text-danger-emphasis" : "bg-success-subtle border-success text-success-emphasis"}`}>
                                        <div className="fw-bold">
                                            Đánh giá của khách: {detailModalOrder.feedback.rating} Sao
                                            {detailModalOrder.feedback.issueCategory !== "none" && (
                                                <span className="ms-1">
                                                    (Phản ánh: {detailModalOrder.feedback.issueCategory === "staff" ? "Lỗi nhân viên" : detailModalOrder.feedback.issueCategory === "ingredient" ? "Lỗi nguyên liệu" : "Lỗi cả nhân viên & nguyên liệu"})
                                                </span>
                                            )}
                                        </div>
                                        {detailModalOrder.feedback.comment && (
                                            <div className="fst-italic mt-1">"{detailModalOrder.feedback.comment}"</div>
                                        )}
                                    </div>
                                )}
                                {detailModalOrder.voidRefund && detailModalOrder.voidRefund.isProcessed && (
                                    <div className="mt-2 p-2 rounded border border-warning bg-warning-subtle text-dark small">
                                        <div className="fw-bold">
                                            Đã xử lý {detailModalOrder.voidRefund.actionType === "void" ? "Void (Miễn thu)" : "Hoàn tiền"} ({detailModalOrder.voidRefund.refundAmount.toLocaleString("vi-VN")} đ)
                                        </div>
                                        <div><strong>Người xử lý:</strong> {detailModalOrder.voidRefund.processedBy} - <strong>Thời gian:</strong> {new Date(detailModalOrder.voidRefund.processedAt).toLocaleString("vi-VN")}</div>
                                        <div><strong>Lý do giải trình:</strong> {detailModalOrder.voidRefund.reason}</div>
                                    </div>
                                )}
                            </div>

                            <Table size="sm" className="small align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Tên món</th>
                                        <th className="text-center">SL</th>
                                        <th className="text-end">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(detailModalOrder.items || []).map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <span className="fw-semibold">
                                                    {toVietnamese(item.name)}
                                                </span>
                                                {item.selectedOption && (
                                                    <Badge bg="secondary" className="ms-2">
                                                        {item.selectedOption}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="text-center">x{item.quantity}</td>
                                            <td className="text-end fw-semibold">
                                                {(item.price * item.quantity).toLocaleString(
                                                    "vi-VN"
                                                )}{" "}
                                                đ
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-top">
                                        <td colSpan={2} className="fw-bold">
                                            Tổng cộng:
                                        </td>
                                        <td className="text-end fw-bold text-danger fs-6">
                                            {(detailModalOrder.totalAmount || 0).toLocaleString(
                                                "vi-VN"
                                            )}{" "}
                                            đ
                                        </td>
                                    </tr>
                                </tfoot>
                            </Table>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {detailModalOrder && detailModalOrder.status === "completed" && !detailModalOrder.voidRefund?.isProcessed && (
                        <Button
                            variant="outline-warning"
                            size="sm"
                            className="fw-semibold me-auto"
                            onClick={() => {
                                const o = detailModalOrder;
                                setDetailModalOrder(null);
                                handleOpenVoidRefund(o);
                            }}
                        >
                            Hoàn Tiền Sự Cố
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDetailModalOrder(null)}
                    >
                        Đóng
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal nhap ly do huy don */}
            <Modal
                show={Boolean(cancelModalOrder)}
                onHide={() => setCancelModalOrder(null)}
                centered
            >
                <Form onSubmit={handleConfirmCancel}>
                    <Modal.Header closeButton>
                        <Modal.Title className="fs-5 fw-bold">
                            Hủy Đơn Hàng {cancelModalOrder?.orderCode}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group>
                            <Form.Label>Lý do hủy đơn (*)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Ví dụ: Khách đổi ý hoặc món vừa hết nguyên liệu..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                required
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setCancelModalOrder(null)}
                        >
                            Đóng
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                            size="sm"
                            disabled={Boolean(updatingId)}
                        >
                            Xác Nhận Hủy Đơn
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal doi ban cho don hang dang phuc vu (chi cho chon ban dang trong) */}
            <Modal
                show={Boolean(changeTableModalOrder)}
                onHide={() => setChangeTableModalOrder(null)}
                centered
            >
                <Form onSubmit={handleConfirmChangeTable}>
                    <Modal.Header closeButton>
                        <Modal.Title className="fs-5 fw-bold">
                            Đổi Bàn Cho Đơn Hàng {changeTableModalOrder?.orderCode}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {changeTableModalOrder && (
                            <>
                                <div className="mb-3 small bg-light p-2 rounded">
                                    <div>
                                        <strong>Bàn hiện tại:</strong>{" "}
                                        <span className="text-primary fw-bold">
                                            {toVietnamese(changeTableModalOrder.tableName)}
                                        </span>
                                    </div>
                                    <div>
                                        <strong>Khách hàng:</strong>{" "}
                                        {toVietnamese(changeTableModalOrder.customerName)}
                                    </div>
                                </div>

                                <Form.Group>
                                    <Form.Label className="fw-semibold">
                                        Chọn bàn mới (Chỉ hiển thị các bàn đang trống) (*)
                                    </Form.Label>
                                    <Form.Select
                                        value={targetTableCode}
                                        onChange={(e) => setTargetTableCode(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Chọn bàn đang trống --</option>
                                        {tables
                                            .filter((t) => t.isActive && !t.isOccupied)
                                            .map((t) => (
                                                <option key={t._id} value={t.code}>
                                                    {toVietnamese(t.name)} ({t.code}) - Bàn trống
                                                </option>
                                            ))}
                                    </Form.Select>
                                    {tables.filter((t) => t.isActive && !t.isOccupied).length ===
                                        0 && (
                                        <Form.Text className="text-danger">
                                            Hiện tại không còn bàn nào đang trống để chuyển!
                                        </Form.Text>
                                    )}
                                </Form.Group>

                                <Form.Group className="mt-3">
                                    <Form.Label className="fw-semibold">
                                        Lý do đổi bàn (*)
                                    </Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        placeholder="Ví dụ: Bàn cũ hơi nóng / Khách muốn ngồi gần cửa sổ..."
                                        value={changeTableReasonText}
                                        onChange={(e) => setChangeTableReasonText(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setChangeTableModalOrder(null)}
                        >
                            Đóng
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={
                                changingTable ||
                                !targetTableCode ||
                                !changeTableReasonText.trim() ||
                                tables.filter((t) => t.isActive && !t.isOccupied).length === 0
                            }
                        >
                            {changingTable ? "Đang chuyển bàn..." : "Xác Nhận Đổi Bàn"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal Xu Ly Su Co (Void / Hoan Tien) */}
            <Modal
                show={Boolean(voidRefundModalOrder)}
                onHide={() => setVoidRefundModalOrder(null)}
                centered
            >
                <Form onSubmit={handleConfirmVoidRefund}>
                    <Modal.Header closeButton>
                        <Modal.Title className="fs-5 fw-bold text-danger">
                            Xử Lý Sự Cố (Void / Hoàn Tiền) - Đơn {voidRefundModalOrder?.orderCode}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {voidRefundModalOrder && (
                            <>
                                {voidRefundModalOrder.feedback?.isBadFeedback && (
                                    <Alert variant="danger" className="py-2 small mb-3">
                                        <div className="fw-bold">
                                            Phản hồi của khách ({voidRefundModalOrder.feedback.rating} Sao):
                                        </div>
                                        <div>
                                            Lỗi phản ánh: {voidRefundModalOrder.feedback.issueCategory === "staff" ? "Thái độ nhân viên" : voidRefundModalOrder.feedback.issueCategory === "ingredient" ? "Chất lượng nguyên liệu / món" : "Cả nhân viên & nguyên liệu"}
                                        </div>
                                        {voidRefundModalOrder.feedback.comment && (
                                            <div className="fst-italic mt-1">
                                                "{voidRefundModalOrder.feedback.comment}"
                                            </div>
                                        )}
                                    </Alert>
                                )}

                                <div className="bg-light p-2 rounded mb-3 small">
                                    <div><strong>Bàn:</strong> {toVietnamese(voidRefundModalOrder.tableName)} - <strong>Khách:</strong> {toVietnamese(voidRefundModalOrder.customerName)}</div>
                                    <div><strong>Tổng đơn gốc:</strong> <span className="text-danger fw-bold">{voidRefundModalOrder.totalAmount.toLocaleString("vi-VN")} đ</span></div>
                                    <div><strong>Trạng thái hiện tại:</strong> {STATUS_BADGE[voidRefundModalOrder.status]?.label || voidRefundModalOrder.status}</div>
                                </div>

                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">
                                        Hình thức xử lý sự cố (*)
                                    </Form.Label>
                                    {["pending", "confirmed", "served"].includes(voidRefundModalOrder.status) ? (
                                        <Form.Select
                                            value={vrActionType}
                                            onChange={(e) => setVrActionType(e.target.value)}
                                        >
                                            <option value="void">Hủy đơn miễn thu tiền (Void) - Đơn chưa thanh toán</option>
                                        </Form.Select>
                                    ) : (
                                        <Form.Select
                                            value={vrActionType}
                                            onChange={(e) => {
                                                const act = e.target.value;
                                                setVrActionType(act);
                                                if (act === "full_refund") {
                                                    setVrRefundAmount(voidRefundModalOrder.totalAmount);
                                                }
                                            }}
                                        >
                                            <option value="full_refund">Hoàn tiền toàn bộ 100% ({voidRefundModalOrder.totalAmount.toLocaleString("vi-VN")} đ)</option>
                                            <option value="partial_refund">Hoàn tiền một phần (Tùy chỉnh số tiền)</option>
                                        </Form.Select>
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">
                                        Nguyên nhân sự cố (*)
                                    </Form.Label>
                                    <Form.Select
                                        value={vrIncidentCategory}
                                        onChange={(e) => setVrIncidentCategory(e.target.value)}
                                        required
                                    >
                                        <option value="staff">Lỗi do thái độ / phục vụ của Nhân Viên</option>
                                        <option value="ingredient">Lỗi do chất lượng Nguyên Liệu / Món Ăn (nguội, hỏng, vị lạ...)</option>
                                        <option value="both">Lỗi do Cả Nhân Viên và Nguyên Liệu</option>
                                    </Form.Select>
                                </Form.Group>

                                {vrActionType === "partial_refund" && (
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">
                                            Số tiền hoàn lại cho khách (đ) (*)
                                        </Form.Label>
                                        <Form.Control
                                            type="number"
                                            min={1}
                                            max={voidRefundModalOrder.totalAmount}
                                            step={1000}
                                            value={vrRefundAmount}
                                            onChange={(e) => setVrRefundAmount(Number(e.target.value))}
                                            required
                                        />
                                        <Form.Text className="text-muted">
                                            Tối đa: {voidRefundModalOrder.totalAmount.toLocaleString("vi-VN")} đ
                                        </Form.Text>
                                    </Form.Group>
                                )}

                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold">
                                        Biên bản / Lý do giải trình sự cố (*)
                                    </Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        placeholder="Ví dụ: Đền bù cho khách do nhân viên sơ ý làm đổ nước / món ăn bị mặn..."
                                        value={vrReason}
                                        onChange={(e) => setVrReason(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setVoidRefundModalOrder(null)}
                        >
                            Đóng
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                            size="sm"
                            disabled={processingVoidRefund}
                        >
                            {processingVoidRefund ? "Đang xử lý..." : "Xác Nhận Xử Lý Sự Cố"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default OrdersBoardPage;
