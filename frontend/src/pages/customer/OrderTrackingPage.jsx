import { useEffect, useState } from "react";
import { Container, Card, Badge, Table, Button, Spinner, Alert, ProgressBar } from "react-bootstrap";
import { useParams, Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { socket } from "../../socket/socket";

const STATUS_MAP = {
    pending: { label: "Cho quan xac nhan", variant: "warning", progress: 25 },
    confirmed: { label: "Quan da nhan, dang lam mon", variant: "primary", progress: 65 },
    completed: { label: "Mon da san sang / Hoan thanh", variant: "success", progress: 100 },
    cancelled: { label: "Don da bi huy", variant: "danger", progress: 100 }
};

const OrderTrackingPage = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // 1. Lay thong tin don
    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setLoading(true);
                const res = await axiosClient.get(`/orders/${orderId}/track`);
                setOrder(res.data);
            } catch (err) {
                setError(typeof err === "string" ? err : "Khong tim thay don hang!");
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    // 2. Tham gia room Socket de nhan cap nhat realtime khi quan duyet don
    useEffect(() => {
        if (!orderId) return;

        socket.emit("order:join", orderId);

        const handleUpdated = (data) => {
            if (String(data.id) === String(orderId)) {
                setOrder((prev) =>
                    prev ? { ...prev, status: data.status, cancelReason: data.cancelReason } : prev
                );
            }
        };

        socket.on("order:updated", handleUpdated);

        return () => {
            socket.emit("order:leave", orderId);
            socket.off("order:updated", handleUpdated);
        };
    }, [orderId]);

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Dang tai thong tin don hang...</p>
            </Container>
        );
    }

    if (error || !order) {
        return (
            <Container className="py-5 text-center">
                <Alert variant="danger">{error || "Khong tim thay thong tin don hang!"}</Alert>
                <Button as={Link} to="/" variant="primary">
                    Ve Thuc Don
                </Button>
            </Container>
        );
    }

    const currentStatus = STATUS_MAP[order.status] || {
        label: order.status,
        variant: "secondary",
        progress: 0
    };

    return (
        <Container className="py-4" style={{ maxWidth: 720 }}>
            <Card className="shadow-sm border-0 mb-4">
                <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <span className="text-muted small">Ma don hang:</span>
                            <h4 className="fw-bold mb-0 text-primary">{order.orderCode}</h4>
                        </div>
                        <Badge
                            bg={currentStatus.variant}
                            text={order.status === "pending" ? "dark" : "white"}
                            className="fs-6 p-2"
                        >
                            {currentStatus.label}
                        </Badge>
                    </div>

                    <ProgressBar
                        animated={order.status === "pending" || order.status === "confirmed"}
                        variant={currentStatus.variant}
                        now={currentStatus.progress}
                        className="mb-4"
                        style={{ height: 10 }}
                    />

                    {order.status === "cancelled" && (
                        <Alert variant="danger" className="py-2">
                            <strong>Ly do huy:</strong> {order.cancelReason || "Khong co ly do cu the."}
                        </Alert>
                    )}

                    <div className="bg-light p-3 rounded mb-3 small">
                        <div>
                            <strong>Ban phuc vu:</strong> {order.tableName}
                        </div>
                        <div>
                            <strong>Thoi gian dat:</strong>{" "}
                            {new Date(order.createdAt).toLocaleString("vi-VN")}
                        </div>
                        {order.note && (
                            <div>
                                <strong>Ghi chu:</strong> {order.note}
                            </div>
                        )}
                    </div>

                    <h6 className="fw-bold mb-2">Chi Tiet Mon Da Goi:</h6>
                    <Table responsive className="small align-middle mb-3">
                        <tbody>
                            {order.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.name}</td>
                                    <td className="text-center">x {item.quantity}</td>
                                    <td className="text-end fw-semibold">
                                        {(item.price * item.quantity).toLocaleString("vi-VN")} d
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-top">
                                <td colSpan={2} className="fw-bold">
                                    Tong cong:
                                </td>
                                <td className="text-end fw-bold text-danger fs-6">
                                    {order.totalAmount.toLocaleString("vi-VN")} d
                                </td>
                            </tr>
                        </tfoot>
                    </Table>

                    <div className="text-center pt-2">
                        <Button as={Link} to="/" variant="outline-primary" size="sm" className="me-2">
                            Goi Them Mon
                        </Button>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default OrderTrackingPage;

