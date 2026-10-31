import { useEffect, useState, useCallback } from "react";
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
    Table
} from "react-bootstrap";
import axiosClient from "../../api/axiosClient";
import { socket } from "../../socket/socket";

const STATUS_BADGE = {
    pending: { label: "Cho xac nhan", bg: "warning", text: "dark" },
    confirmed: { label: "Dang chuan bi", bg: "primary", text: "white" },
    completed: { label: "Hoan thanh", bg: "success", text: "white" },
    cancelled: { label: "Da huy", bg: "danger", text: "white" }
};

const getLocalToday = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

// Ham phat am thanh bao don moi bang Web Audio API
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
    } catch (e) {
        // Bo qua neu trinh duyet chan autoplay audio
    }
};

const OrdersBoardPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [realtimeAlert, setRealtimeAlert] = useState("");

    const [statusFilter, setStatusFilter] = useState("");
    const [selectedDate, setSelectedDate] = useState(getLocalToday);

    // State cho Modal Huy don
    const [cancelModalOrder, setCancelModalOrder] = useState(null);
    const [cancelReason, setCancelReason] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const params = new URLSearchParams();
            if (statusFilter) params.append("status", statusFilter);
            if (selectedDate) params.append("date", selectedDate);

            const res = await axiosClient.get(`/orders?${params.toString()}`);
            setOrders(res.data || []);
        } catch (err) {
            setError(typeof err === "string" ? err : "Khong the tai danh sach don hang!");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, selectedDate]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Lang nghe Socket realtime: Don moi & Cap nhat trang thai don
    useEffect(() => {
        const handleNewOrder = (newOrder) => {
            playNotificationSound();
            setRealtimeAlert(
                `Co don hang moi [${newOrder.orderCode}] tai ${newOrder.tableName} - Khach: ${newOrder.customerName}`
            );
            setTimeout(() => setRealtimeAlert(""), 6000);

            setOrders((prev) => {
                const exists = prev.some((o) => String(o._id) === String(newOrder._id));
                if (exists) return prev;
                if (statusFilter && statusFilter !== newOrder.status) return prev;
                return [newOrder, ...prev];
            });
        };

        const handleOrderUpdated = (payload) => {
            setOrders((prev) =>
                prev.map((ord) =>
                    String(ord._id) === String(payload.id)
                        ? {
                              ...ord,
                              status: payload.status,
                              cancelReason: payload.cancelReason,
                              updatedAt: payload.updatedAt
                          }
                        : ord
                )
            );
        };

        socket.on("order:new", handleNewOrder);
        socket.on("order:updated", handleOrderUpdated);

        return () => {
            socket.off("order:new", handleNewOrder);
            socket.off("order:updated", handleOrderUpdated);
        };
    }, [statusFilter]);

    // Chuyen trang thai don (confirmed hoac completed)
    const handleStatusChange = async (orderId, nextStatus, reason = "") => {
        try {
            setUpdatingId(orderId);
            setError("");
            const res = await axiosClient.patch(`/orders/${orderId}/status`, {
                status: nextStatus,
                cancelReason: reason
            });
            const updatedOrder = res.data;

            setOrders((prev) =>
                prev.map((ord) => (String(ord._id) === String(orderId) ? updatedOrder : ord))
            );
            setCancelModalOrder(null);
            setCancelReason("");
        } catch (err) {
            setError(typeof err === "string" ? err : "Cap nhat trang thai don that bai!");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleConfirmCancel = (e) => {
        e.preventDefault();
        if (!cancelReason.trim()) {
            setError("Vui long nhap ly do huy don!");
            return;
        }
        handleStatusChange(cancelModalOrder._id, "cancelled", cancelReason.trim());
    };

    // Thong ke nhanh
    const pendingCount = orders.filter((o) => o.status === "pending").length;
    const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
    const completedRevenue = orders
        .filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return (
        <div>
            {realtimeAlert && (
                <Alert
                    variant="success"
                    className="fw-bold shadow-sm border-success"
                    dismissible
                    onClose={() => setRealtimeAlert("")}
                >
                    [THONG BAO REALTIME] {realtimeAlert}
                </Alert>
            )}

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError("")}>
                    {error}
                </Alert>
            )}

            {/* Thong ke nhanh */}
            <Row className="g-3 mb-4">
                <Col sm={6} md={3}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body className="py-3">
                            <div className="text-muted small">Tong So Don</div>
                            <div className="fs-4 fw-bold">{orders.length}</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col sm={6} md={3}>
                    <Card className="border-0 shadow-sm h-100 border-start border-4 border-warning">
                        <Card.Body className="py-3">
                            <div className="text-muted small">Cho Xac Nhan</div>
                            <div className="fs-4 fw-bold text-warning">{pendingCount}</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col sm={6} md={3}>
                    <Card className="border-0 shadow-sm h-100 border-start border-4 border-primary">
                        <Card.Body className="py-3">
                            <div className="text-muted small">Bep Dang Lam</div>
                            <div className="fs-4 fw-bold text-primary">{confirmedCount}</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col sm={6} md={3}>
                    <Card className="border-0 shadow-sm h-100 border-start border-4 border-success">
                        <Card.Body className="py-3">
                            <div className="text-muted small">Doanh Thu Hoan Thanh</div>
                            <div className="fs-4 fw-bold text-success">
                                {completedRevenue.toLocaleString("vi-VN")} d
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Bo loc */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <ButtonGroup className="flex-wrap">
                        <Button
                            variant={statusFilter === "" ? "dark" : "outline-dark"}
                            size="sm"
                            onClick={() => setStatusFilter("")}
                        >
                            Tat Ca
                        </Button>
                        <Button
                            variant={statusFilter === "pending" ? "warning" : "outline-secondary"}
                            size="sm"
                            onClick={() => setStatusFilter("pending")}
                        >
                            Cho Xac Nhan
                        </Button>
                        <Button
                            variant={statusFilter === "confirmed" ? "primary" : "outline-secondary"}
                            size="sm"
                            onClick={() => setStatusFilter("confirmed")}
                        >
                            Dang Chuan Bi
                        </Button>
                        <Button
                            variant={statusFilter === "completed" ? "success" : "outline-secondary"}
                            size="sm"
                            onClick={() => setStatusFilter("completed")}
                        >
                            Hoan Thanh
                        </Button>
                        <Button
                            variant={statusFilter === "cancelled" ? "danger" : "outline-secondary"}
                            size="sm"
                            onClick={() => setStatusFilter("cancelled")}
                        >
                            Da Huy
                        </Button>
                    </ButtonGroup>

                    <div className="d-flex align-items-center gap-2">
                        <Form.Label className="mb-0 small text-muted text-nowrap">Ngay:</Form.Label>
                        <Form.Control
                            type="date"
                            size="sm"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ width: 155 }}
                        />
                        <Button variant="outline-primary" size="sm" onClick={fetchOrders}>
                            Lam Moi
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            {/* Danh sach the don hang */}
            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted">Dang tai danh sach don hang...</p>
                </div>
            ) : orders.length === 0 ? (
                <Card className="border-0 shadow-sm text-center py-5">
                    <Card.Body>
                        <h5 className="text-muted mb-1">Chua co don hang nao trong danh sach</h5>
                        <p className="small text-muted mb-0">
                            Khi khach dat mon tai ban, don hang moi se tu dong hien thi ngay tai day.
                        </p>
                    </Card.Body>
                </Card>
            ) : (
                <Row className="g-3">
                    {orders.map((order) => {
                        const badgeInfo = STATUS_BADGE[order.status] || {
                            label: order.status,
                            bg: "secondary",
                            text: "white"
                        };
                        const isUpdating = updatingId === order._id;

                        return (
                            <Col key={order._id} md={6} lg={4}>
                                <Card className="h-100 border-0 shadow-sm">
                                    <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
                                        <div>
                                            <span className="fw-bold text-primary fs-6">
                                                {order.orderCode}
                                            </span>
                                            <Badge bg="dark" className="ms-2">
                                                {order.tableName}
                                            </Badge>
                                        </div>
                                        <Badge bg={badgeInfo.bg} text={badgeInfo.text}>
                                            {badgeInfo.label}
                                        </Badge>
                                    </Card.Header>

                                    <Card.Body className="d-flex flex-column">
                                        <div className="small mb-2 text-muted">
                                            <div>
                                                <strong>Khach hang:</strong> {order.customerName} (
                                                {order.customerPhone})
                                            </div>
                                            <div>
                                                <strong>Gio dat:</strong>{" "}
                                                {new Date(order.createdAt).toLocaleTimeString("vi-VN")}{" "}
                                                - {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                                            </div>
                                            {order.note && (
                                                <div className="text-danger fw-semibold mt-1">
                                                    Ghi chu: {order.note}
                                                </div>
                                            )}
                                            {order.status === "cancelled" && order.cancelReason && (
                                                <div className="text-danger mt-1">
                                                    <strong>Ly do huy:</strong> {order.cancelReason}
                                                </div>
                                            )}
                                        </div>

                                        <Table size="sm" className="small mb-3 align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Ten mon</th>
                                                    <th className="text-center">SL</th>
                                                    <th className="text-end">Gia</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {order.items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td>{item.name}</td>
                                                        <td className="text-center fw-bold">
                                                            x{item.quantity}
                                                        </td>
                                                        <td className="text-end">
                                                            {(item.price * item.quantity).toLocaleString(
                                                                "vi-VN"
                                                            )}{" "}
                                                            d
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>

                                        <div className="mt-auto pt-2 border-top">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <span className="small text-muted">Tong cong:</span>
                                                <strong className="text-danger fs-5">
                                                    {order.totalAmount.toLocaleString("vi-VN")} d
                                                </strong>
                                            </div>

                                            {/* Cac nut thao tac trang thai */}
                                            {order.status === "pending" && (
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        className="flex-grow-1 fw-bold"
                                                        disabled={isUpdating}
                                                        onClick={() =>
                                                            handleStatusChange(order._id, "confirmed")
                                                        }
                                                    >
                                                        Xac Nhan Don
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        disabled={isUpdating}
                                                        onClick={() => {
                                                            setCancelModalOrder(order);
                                                            setCancelReason("");
                                                        }}
                                                    >
                                                        Huy Don
                                                    </Button>
                                                </div>
                                            )}

                                            {order.status === "confirmed" && (
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        className="flex-grow-1 fw-bold"
                                                        disabled={isUpdating}
                                                        onClick={() =>
                                                            handleStatusChange(order._id, "completed")
                                                        }
                                                    >
                                                        Hoan Thanh / Da Phuc Vu
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        disabled={isUpdating}
                                                        onClick={() => {
                                                            setCancelModalOrder(order);
                                                            setCancelReason("");
                                                        }}
                                                    >
                                                        Huy Don
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}

            {/* Modal nhap ly do huy don */}
            <Modal
                show={Boolean(cancelModalOrder)}
                onHide={() => setCancelModalOrder(null)}
                centered
            >
                <Form onSubmit={handleConfirmCancel}>
                    <Modal.Header closeButton>
                        <Modal.Title className="fs-5 fw-bold">
                            Huy Don Hang {cancelModalOrder?.orderCode}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group>
                            <Form.Label>Ly do huy don (*)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Vi du: Khach doi y hoac mon vua het nguyen lieu..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                required
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" size="sm" onClick={() => setCancelModalOrder(null)}>
                            Dong
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                            size="sm"
                            disabled={Boolean(updatingId)}
                        >
                            Xac Nhan Huy Don
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default OrdersBoardPage;

