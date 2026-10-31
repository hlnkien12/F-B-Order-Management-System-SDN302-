import { useEffect, useState } from "react";
import { Container, Card, Badge, Table, Button, Spinner, Alert, ProgressBar } from "react-bootstrap";
import { useParams, Link, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { socket } from "../../socket/socket";
import { toVietnamese } from "../../utils/vietnameseDictionary";
import { useCart } from "../../context/CartContext";

const STATUS_MAP = {
    pending: { label: "Chờ quán xác nhận", variant: "warning", progress: 20 },
    confirmed: { label: "Quán đã nhận, đang làm món", variant: "primary", progress: 50 },
    served: { label: "Đã lên món / Đang dùng bữa", variant: "info", progress: 80 },
    completed: { label: "Đã thanh toán hoàn tất", variant: "success", progress: 100 },
    cancelled: { label: "Đơn đã bị hủy", variant: "danger", progress: 100 }
};

const OrderTrackingPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { restoreItemsToCart, saveGuestOrder, refreshSessionOrders } = useCart();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState("");

    // 1. Luu ma don vao danh sach khach vang lai tren thiet bi
    useEffect(() => {
        if (orderId && saveGuestOrder) {
            saveGuestOrder(orderId);
        }
    }, [orderId, saveGuestOrder]);

    // 2. Lay thong tin don
    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setLoading(true);
                const res = await axiosClient.get(`/orders/${orderId}/track`);
                setOrder(res.data?.data || res.data);
            } catch (err) {
                setError(typeof err === "string" ? err : "Không tìm thấy đơn hàng!");
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

    // 3. Khach tu huy don khi don con o trang thai cho quan xac nhan (pending)
    const handleCancelOrder = async () => {
        const confirmCancel = window.confirm("Bạn có chắc chắn muốn hủy đơn này không?");
        if (!confirmCancel) return;

        try {
            setCancelling(true);
            const res = await axiosClient.post(`/orders/${orderId}/cancel`, {
                reason: "Khách hàng tự hủy khi đang chờ xác nhận"
            });
            const updated = res.data?.data || res.data;
            setOrder(updated);
            if (refreshSessionOrders) {
                refreshSessionOrders();
            }

            const shouldRestore = window.confirm(
                "Đơn hàng đã được hủy thành công!\n\nBạn có muốn nạp lại các món này vào giỏ hàng để chỉnh sửa và đặt lại không?"
            );
            if (shouldRestore) {
                restoreItemsToCart(order.items);
                navigate("/cart");
            }
        } catch (err) {
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                (typeof err === "string" ? err : "Không thể hủy đơn hàng!");
            alert(msg);
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Đang tra cứu đơn hàng...</p>
            </Container>
        );
    }

    if (error || !order) {
        return (
            <Container className="py-5 text-center" style={{ maxWidth: 500 }}>
                <Alert variant="danger">{error || "Đơn hàng không tồn tại!"}</Alert>
                <Button as={Link} to="/" variant="primary">
                    Về Trang Thực Đơn
                </Button>
            </Container>
        );
    }

    const currentStatus = STATUS_MAP[order.status] || {
        label: order.status,
        variant: "secondary",
        progress: 10
    };

    return (
        <Container className="py-4" style={{ maxWidth: 650 }}>
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white py-3 border-0 d-flex justify-content-between align-items-center">
                    <div>
                        <span className="text-muted small">Mã đơn hàng:</span>
                        <h5 className="fw-bold mb-0 text-primary">{order.orderCode}</h5>
                    </div>
                    <Badge bg={currentStatus.variant} className="fs-6 px-3 py-2">
                        {currentStatus.label}
                    </Badge>
                </Card.Header>

                <Card.Body className="p-4">
                    {/* Thanh tien do don hang */}
                    <div className="mb-4">
                        <ProgressBar
                            now={currentStatus.progress}
                            variant={currentStatus.variant}
                            animated={["pending", "confirmed"].includes(order.status)}
                            style={{ height: 10 }}
                        />
                        <div className="d-flex justify-content-between small text-muted mt-2">
                            <span>1. Đã gửi</span>
                            <span>2. Đang làm</span>
                            <span>3. Đã phục vụ</span>
                            <span>4. Đã thanh toán</span>
                        </div>
                    </div>

                    {order.status === "cancelled" && (
                        <Alert variant="danger" className="py-2">
                            <strong>Lý do hủy:</strong> {order.cancelReason || "Không có lý do cụ thể."}
                        </Alert>
                    )}

                    <div className="bg-light p-3 rounded mb-3 small">
                        <div>
                            <strong>Bàn phục vụ:</strong> {toVietnamese(order.tableName)}
                        </div>
                        <div>
                            <strong>Thời gian đặt:</strong>{" "}
                            {new Date(order.createdAt).toLocaleString("vi-VN")}
                        </div>
                        {order.note && (
                            <div>
                                <strong>Ghi chú:</strong> {order.note}
                            </div>
                        )}
                    </div>

                    <h6 className="fw-bold mb-2">Chi Tiết Món Đã Gọi:</h6>
                    <Table responsive className="small align-middle mb-3">
                        <tbody>
                            {order.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <span className="fw-semibold">{toVietnamese(item.name)}</span>
                                        {item.selectedOption && (
                                            <Badge
                                                bg={item.selectedOption === "Đặc biệt" || item.selectedOption.includes("XL") ? "danger" : "secondary"}
                                                className="ms-2 fw-normal"
                                                style={{ fontSize: "0.75rem" }}
                                            >
                                                {item.selectedOption}
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="text-center">x {item.quantity}</td>
                                    <td className="text-end fw-semibold">
                                        {(item.price * item.quantity).toLocaleString("vi-VN")} đ
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
                                    {order.totalAmount.toLocaleString("vi-VN")} đ
                                </td>
                            </tr>
                        </tfoot>
                    </Table>

                    {order.status === "pending" && (
                        <div className="mb-3">
                            <Button
                                variant="outline-danger"
                                className="w-100 fw-bold py-2"
                                onClick={handleCancelOrder}
                                disabled={cancelling}
                            >
                                {cancelling ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Đang xử lý hủy đơn...
                                    </>
                                ) : (
                                    "Hủy Đơn Hàng"
                                )}
                            </Button>
                        </div>
                    )}

                    <div className="d-flex gap-2">
                        <Button as={Link} to="/" variant="outline-primary" className="flex-grow-1">
                            Đặt Thêm Món Khác
                        </Button>
                        <Button as={Link} to="/cart" variant="outline-secondary">
                            Về Giỏ Hàng & Đơn Bàn
                        </Button>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default OrderTrackingPage;
