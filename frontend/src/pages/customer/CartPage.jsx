import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Table, Button, Form, Alert, Spinner, Badge } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import axiosClient from "../../api/axiosClient";
import { toVietnamese } from "../../utils/vietnameseDictionary";
import OrderedItemsTab from "../../components/customer/OrderedItemsTab";

const CartPage = () => {
    const {
        cartItems,
        tableCode,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalCount,
        totalAmount,
        saveGuestOrder,
        sessionOrders,
        setSessionOrders,
        refreshSessionOrders
    } = useCart();
    const { user } = useAuth();

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [note, setNote] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Kiem tra don chua thanh toan trong phien hien tai (pending, confirmed, served)
    const unpaidOrder = sessionOrders.find((ord) =>
        ["pending", "confirmed", "served"].includes(ord.status)
    );

    // Tu dong dien thong tin neu da dang nhap
    useEffect(() => {
        if (user) {
            if (!customerName) setCustomerName(user.name || "");
            if (!customerPhone) setCustomerPhone(user.phone || "");
        }
    }, [user]);

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        setError("");

        if (unpaidOrder) {
            setError(
                `Bạn đang có đơn hàng [${unpaidOrder.orderCode}] chưa thanh toán xong! Vui lòng hoàn tất thanh toán đơn hiện tại trước khi tạo đơn mới.`
            );
            return;
        }
        if (!tableCode) {
            setError("Vui lòng chọn bàn trước khi gửi đơn!");
            return;
        }
        if (cartItems.length === 0) {
            setError("Giỏ hàng đang trống!");
            return;
        }
        const phoneRegex = /^0[0-9]{9}$/;
        if (customerPhone.trim() && !phoneRegex.test(customerPhone.trim())) {
            setError("Số điện thoại phải đủ 10 chữ số và bắt đầu bằng số 0 (hoặc bỏ trống)!");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                tableCode,
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim(),
                note: note.trim(),
                items: cartItems.map((item) => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    selectedOption: item.selectedOption || ""
                }))
            };

            const res = await axiosClient.post("/orders", payload);
            const createdOrder = res.data?.data || res.data;

            if (createdOrder?._id) {
                if (saveGuestOrder) {
                    saveGuestOrder(createdOrder._id);
                }
                setSessionOrders((prev) => [
                    createdOrder,
                    ...prev.filter((o) => String(o._id) !== String(createdOrder._id))
                ]);
            }

            // Xoa gio hang va lam moi danh sach don cua ban
            clearCart();
            setNote("");
            refreshSessionOrders();
        } catch (err) {
            setError(typeof err === "string" ? err : "Gửi đơn thất bại!");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container className="py-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <h3 className="fw-bold mb-0">Giỏ Hàng & Đơn Của Bàn</h3>
                <Button as={Link} to="/" variant="outline-primary" size="sm">
                    + Chọn Thêm Món
                </Button>
            </div>

            {/* Khung dat mon moi (chi hien thi khi khach dang co mon trong gio) */}
            {cartItems.length > 0 && (
                <div className="mb-5">
                    {unpaidOrder && (
                        <Alert variant="warning" className="fw-semibold shadow-sm border-warning">
                            Bàn hiện đang có đơn hàng <strong>[{unpaidOrder.orderCode}]</strong> chưa thanh toán xong. Theo quy định của quán, vui lòng hoàn tất thanh toán đơn hiện tại (hoặc hủy đơn nếu đang chờ xác nhận) trước khi gửi đơn hàng mới!
                        </Alert>
                    )}
                    {error && <Alert variant="danger">{error}</Alert>}

                    <Row className="g-4">
                        <Col lg={7}>
                            <Card className="shadow-sm border-0">
                                <Card.Body className="p-0">
                                    <Table responsive className="align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Món</th>
                                                <th className="text-center">Giá</th>
                                                <th className="text-center" style={{ width: 140 }}>
                                                    Số Lượng
                                                </th>
                                                <th className="text-end">Thành Tiền</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cartItems.map((item) => {
                                                const key = item.cartKey || item.menuItemId;
                                                return (
                                                    <tr key={key}>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <img
                                                                    src={
                                                                        item.image ||
                                                                        "/images/pho-bo.jpg"
                                                                    }
                                                                    alt={item.name}
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src =
                                                                            "/images/pho-bo.jpg";
                                                                    }}
                                                                    style={{
                                                                        width: 48,
                                                                        height: 48,
                                                                        objectFit: "cover",
                                                                        borderRadius: 6
                                                                    }}
                                                                />
                                                                <div>
                                                                    <div className="fw-semibold">
                                                                        {toVietnamese(item.name)}
                                                                    </div>
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
                                                                            className="fw-normal"
                                                                            style={{
                                                                                fontSize: "0.75rem"
                                                                            }}
                                                                        >
                                                                            {item.selectedOption}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center small">
                                                            {item.price.toLocaleString("vi-VN")} đ
                                                        </td>
                                                        <td className="text-center">
                                                            <div className="d-flex align-items-center justify-content-center gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline-secondary"
                                                                    className="py-0 px-2"
                                                                    onClick={() =>
                                                                        updateQuantity(
                                                                            key,
                                                                            item.quantity - 1
                                                                        )
                                                                    }
                                                                >
                                                                    -
                                                                </Button>
                                                                <span className="px-2 fw-bold">
                                                                    {item.quantity}
                                                                </span>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline-secondary"
                                                                    className="py-0 px-2"
                                                                    onClick={() =>
                                                                        updateQuantity(
                                                                            key,
                                                                            item.quantity + 1
                                                                        )
                                                                    }
                                                                >
                                                                    +
                                                                </Button>
                                                            </div>
                                                        </td>
                                                        <td className="text-end fw-bold text-danger">
                                                            {(
                                                                item.price * item.quantity
                                                            ).toLocaleString("vi-VN")}{" "}
                                                            đ
                                                        </td>
                                                        <td className="text-center">
                                                            <Button
                                                                size="sm"
                                                                variant="link"
                                                                className="text-danger p-0"
                                                                onClick={() => removeFromCart(key)}
                                                            >
                                                                Xóa
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={5}>
                            <Card className="shadow-sm border-0">
                                <Card.Body className="p-4">
                                    <h5 className="fw-bold mb-3">Thông Tin Gọi Món</h5>

                                    <Form onSubmit={handleSubmitOrder}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Vị trí bàn (*)</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={tableCode ? `Bàn ${tableCode}` : ""}
                                                placeholder="Chưa chọn bàn"
                                                readOnly
                                                disabled
                                                className="bg-light fw-bold text-primary"
                                            />
                                            {!tableCode && (
                                                <Form.Text className="text-danger">
                                                    Vui lòng quét QR tại bàn hoặc chọn bàn ở trang
                                                    Thực đơn!
                                                </Form.Text>
                                            )}
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Họ tên của bạn (Tùy chọn)</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Có thể bỏ trống (Mặc định: Khách tại bàn)"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Số điện thoại (Tùy chọn)</Form.Label>
                                            <Form.Control
                                                type="tel"
                                                placeholder="Có thể bỏ trống (Ví dụ: 0912345678)"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Ghi chú cho nhà bếp</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={2}
                                                placeholder="Ví dụ: Ít đường, không hành, làm cay..."
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                maxLength={300}
                                            />
                                        </Form.Group>

                                        <div className="border-top pt-3 mb-3">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="text-muted">Tổng số món:</span>
                                                <span className="fw-semibold">
                                                    {totalCount} phần
                                                </span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="fs-5 fw-bold">
                                                    Tổng thanh toán:
                                                </span>
                                                <span className="fs-4 fw-bold text-danger">
                                                    {totalAmount.toLocaleString("vi-VN")} đ
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="lg"
                                            className="w-100 fw-bold shadow-sm"
                                            disabled={
                                                submitting || !tableCode || Boolean(unpaidOrder)
                                            }
                                        >
                                            {submitting ? (
                                                <>
                                                    <Spinner
                                                        animation="border"
                                                        size="sm"
                                                        className="me-2"
                                                    />
                                                    Đang gửi đơn...
                                                </>
                                            ) : unpaidOrder ? (
                                                `Chờ Thanh Toán Đơn [${unpaidOrder.orderCode}]`
                                            ) : (
                                                "Gửi Đơn Cho Nhà Bếp"
                                            )}
                                        </Button>
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </div>
            )}

            {/* Danh sach cac order cua khach */}
            {cartItems.length > 0 && sessionOrders.length > 0 && (
                <h5 className="fw-bold mb-3">Các Đơn Đã Gọi Của Bàn</h5>
            )}
            <OrderedItemsTab hideEmptyState={cartItems.length > 0} />
        </Container>
    );
};

export default CartPage;
