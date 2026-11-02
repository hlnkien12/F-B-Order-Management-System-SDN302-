import { useEffect, useState } from "react";
import { Container, Card, Badge, Table, Button, Spinner, Alert, ProgressBar, Modal, Form } from "react-bootstrap";
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

    // State cho Modal Danh Gia / Bao su co
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [rating, setRating] = useState(5);
    const [issueCategory, setIssueCategory] = useState("none");
    const [feedbackComment, setFeedbackComment] = useState("");
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

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
                    prev
                        ? {
                              ...prev,
                              status: data.status,
                              cancelReason: data.cancelReason,
                              ...(data.tableName ? { tableName: data.tableName } : {}),
                              ...(data.changeTableReason !== undefined
                                  ? { changeTableReason: data.changeTableReason }
                                  : {}),
                              ...(data.feedback !== undefined ? { feedback: data.feedback } : {}),
                              ...(data.voidRefund !== undefined
                                  ? { voidRefund: data.voidRefund }
                                  : {})
                          }
                        : prev
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

    const handleOpenFeedback = () => {
        setRating(order?.feedback?.rating || 5);
        setIssueCategory(order?.feedback?.issueCategory || "none");
        setFeedbackComment(order?.feedback?.comment || "");
        setShowFeedbackModal(true);
    };

    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        const isBad = Number(rating) <= 2 || issueCategory !== "none";
        if (isBad && !feedbackComment.trim()) {
            alert(
                "Vui lòng nhập nội dung phản hồi chi tiết về vấn đề nhân viên hoặc nguyên liệu để quán kịp thời hỗ trợ!"
            );
            return;
        }

        try {
            setSubmittingFeedback(true);
            const res = await axiosClient.post(`/orders/${orderId}/feedback`, {
                rating: Number(rating),
                issueCategory,
                comment: feedbackComment.trim()
            });
            const updated = res.data?.data || res.data;
            if (updated) {
                setOrder(updated);
            }
            if (refreshSessionOrders) {
                refreshSessionOrders();
            }
            alert(res.data?.message || "Cảm ơn bạn đã gửi đánh giá!");
            setShowFeedbackModal(false);
        } catch (err) {
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                (typeof err === "string" ? err : "Gửi đánh giá thất bại!");
            alert(msg);
        } finally {
            setSubmittingFeedback(false);
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

                    {order.voidRefund && order.voidRefund.isProcessed && (
                        <Alert
                            variant={order.voidRefund.actionType === "void" ? "danger" : "warning"}
                            className="py-2"
                        >
                            <div className="fw-bold fs-6">
                                {order.voidRefund.actionType === "void" && "Đơn hàng đã được Miễn Thu (Void)"}
                                {order.voidRefund.actionType === "full_refund" && `Đã Hoàn Tiền 100% (${(order.voidRefund.refundAmount || order.totalAmount).toLocaleString("vi-VN")} đ)`}
                                {order.voidRefund.actionType === "partial_refund" && `Đã Hoàn Tiền Một Phần (${(order.voidRefund.refundAmount || 0).toLocaleString("vi-VN")} đ)`}
                            </div>
                            <div className="small mt-1">
                                <strong>Lý do sự cố ({order.voidRefund.incidentCategory === "staff" ? "Nhân viên" : order.voidRefund.incidentCategory === "ingredient" ? "Nguyên liệu" : "Cả nhân viên và nguyên liệu"}):</strong> {order.voidRefund.reason}
                            </div>
                        </Alert>
                    )}

                    {order.feedback && order.feedback.submittedAt && (
                        <div
                            className={`p-3 rounded mb-3 border small ${
                                order.feedback.isBadFeedback
                                    ? "bg-danger-subtle border-danger text-danger-emphasis"
                                    : "bg-success-subtle border-success text-success-emphasis"
                            }`}
                        >
                            <div className="fw-bold">
                                Đánh giá của bạn: {order.feedback.rating} Sao
                                {order.feedback.issueCategory !== "none" && (
                                    <span className="ms-1">
                                        (Phản ánh: {order.feedback.issueCategory === "staff" ? "Lỗi nhân viên" : order.feedback.issueCategory === "ingredient" ? "Lỗi nguyên liệu" : "Lỗi nhân viên & nguyên liệu"})
                                    </span>
                                )}
                            </div>
                            {order.feedback.comment && (
                                <div className="fst-italic mt-1">"{order.feedback.comment}"</div>
                            )}
                        </div>
                    )}

                    <div className="bg-light p-3 rounded mb-3 small">
                        <div>
                            <strong>Bàn phục vụ:</strong> {toVietnamese(order.tableName)}
                        </div>
                        {order.changeTableReason && (
                            <div className="text-info-emphasis mt-1">
                                <strong>Lịch sử đổi bàn:</strong> {order.changeTableReason}
                            </div>
                        )}
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
                            {order.voidRefund && order.voidRefund.isProcessed && order.voidRefund.refundAmount > 0 && (
                                <tr>
                                    <td colSpan={2} className="fw-semibold text-success">
                                        Đã hoàn trả lại ({order.voidRefund.actionType === "full_refund" ? "100%" : "Một phần"}):
                                    </td>
                                    <td className="text-end fw-bold text-success fs-6">
                                        -{order.voidRefund.refundAmount.toLocaleString("vi-VN")} đ
                                    </td>
                                </tr>
                            )}
                        </tfoot>
                    </Table>

                    {["served", "completed"].includes(order.status) && (
                        <div className="mb-3">
                            <Button
                                variant={order.feedback?.submittedAt ? "outline-success" : "outline-warning"}
                                className="w-100 fw-bold py-2"
                                onClick={handleOpenFeedback}
                            >
                                {order.feedback?.submittedAt
                                    ? `Đã Đánh Giá (${order.feedback.rating} Sao)`
                                    : "Đánh Giá / Phản Hồi Dịch Vụ"}
                            </Button>
                        </div>
                    )}

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

            {/* Modal Gui Danh Gia / Bao su co */}
            <Modal
                show={showFeedbackModal}
                onHide={() => setShowFeedbackModal(false)}
                centered
            >
                <Form onSubmit={handleSubmitFeedback}>
                    <Modal.Header closeButton>
                        <Modal.Title className="fs-5 fw-bold">
                            Đánh Giá Đơn {order.orderCode} ({toVietnamese(order.tableName)})
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                                Mức độ hài lòng (*)
                            </Form.Label>
                            <Form.Select
                                value={rating}
                                onChange={(e) => setRating(Number(e.target.value))}
                            >
                                <option value={5}>5 Sao - Rất hài lòng / Đồ ăn ngon</option>
                                <option value={4}>4 Sao - Hài lòng / Phục vụ tốt</option>
                                <option value={3}>3 Sao - Bình thường / Tạm ổn</option>
                                <option value={2}>2 Sao - Chưa hài lòng</option>
                                <option value={1}>1 Sao - Rất tệ / Không hài lòng</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                                Phân loại sự cố (nếu có)
                            </Form.Label>
                            <Form.Select
                                value={issueCategory}
                                onChange={(e) => setIssueCategory(e.target.value)}
                            >
                                <option value="none">Không có sự cố (Hài lòng)</option>
                                <option value="staff">Thái độ / tác phong của nhân viên chưa tốt</option>
                                <option value="ingredient">Chất lượng nguyên liệu / món ăn có vấn đề</option>
                                <option value="both">Gặp sự cố cả nhân viên và nguyên liệu</option>
                            </Form.Select>
                            {issueCategory !== "none" && (
                                <Form.Text className="text-danger fw-semibold">
                                    Phản hồi này sẽ được gửi trực tiếp tới quản lý quán để hỗ trợ hoàn tiền hoặc xử lý ngay!
                                </Form.Text>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                                Nội dung phản hồi chi tiết {(Number(rating) <= 2 || issueCategory !== "none") && "(*)"}
                            </Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Mô tả trải nghiệm của bạn hoặc chi tiết sự cố gặp phải..."
                                value={feedbackComment}
                                onChange={(e) => setFeedbackComment(e.target.value)}
                                required={Number(rating) <= 2 || issueCategory !== "none"}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowFeedbackModal(false)}
                        >
                            Đóng
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={submittingFeedback}
                        >
                            {submittingFeedback ? "Đang gửi..." : "Gửi Đánh Giá"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default OrderTrackingPage;
