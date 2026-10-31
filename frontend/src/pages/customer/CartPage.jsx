import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Table, Button, Form, Alert, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import axiosClient from "../../api/axiosClient";
import { toVietnamese } from "../../utils/vietnameseDictionary";

const CartPage = () => {
    const { cartItems, tableCode, setTableCode, updateQuantity, removeFromCart, clearCart, totalAmount } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [note, setNote] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Tự động điền thông tin nếu đã đăng nhập
    useEffect(() => {
        if (user) {
            if (!customerName) setCustomerName(user.name || "");
            if (!customerPhone) setCustomerPhone(user.phone || "");
        }
    }, [user]);

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        setError("");

        if (!tableCode) {
            setError("Vui lòng chọn bàn trước khi gửi đơn!");
            return;
        }
        if (cartItems.length === 0) {
            setError("Giỏ hàng đang trống!");
            return;
        }
        if (!customerName.trim()) {
            setError("Vui lòng nhập họ tên!");
            return;
        }
        const phoneRegex = /^0[0-9]{9}$/;
        if (!phoneRegex.test(customerPhone.trim())) {
            setError("Số điện thoại phải đủ 10 chữ số và bắt đầu bằng số 0!");
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
                    quantity: item.quantity
                }))
            };

            const res = await axiosClient.post("/orders", payload);
            const createdOrder = res.data;

            // Xóa giỏ hàng và chuyển sang trang theo dõi đơn
            clearCart();
            navigate(`/track/${createdOrder._id}`);
        } catch (err) {
            setError(typeof err === "string" ? err : "Gửi đơn thất bại!");
        } finally {
            setSubmitting(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <Container className="py-5 text-center">
                <h4 className="fw-bold mb-3">Giỏ hàng của bạn đang trống</h4>
                <p className="text-muted">Hãy chọn những món ăn và đồ uống thơm ngon từ thực đơn nhé!</p>
                <Button as={Link} to="/" variant="primary">
                    Xem Thực Đơn
                </Button>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <h3 className="fw-bold mb-4">Giỏ Hàng Của Bạn</h3>

            {error && <Alert variant="danger">{error}</Alert>}

            <Row className="g-4">
                {/* Danh sách món */}
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
                                    {cartItems.map((item) => (
                                        <tr key={item.menuItemId}>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <img
                                                        src={item.image || "/images/pho-bo.jpg"}
                                                        alt={item.name}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = "/images/pho-bo.jpg";
                                                        }}
                                                        style={{
                                                            width: 48,
                                                            height: 48,
                                                            objectFit: "cover",
                                                            borderRadius: 6
                                                        }}
                                                    />
                                                    <span className="fw-semibold">{toVietnamese(item.name)}</span>
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
                                                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                                                    >
                                                        -
                                                    </Button>
                                                    <span className="px-2 fw-bold">{item.quantity}</span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-secondary"
                                                        className="py-0 px-2"
                                                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            </td>
                                            <td className="text-end fw-bold text-danger">
                                                {(item.price * item.quantity).toLocaleString("vi-VN")} đ
                                            </td>
                                            <td className="text-center">
                                                <Button
                                                    size="sm"
                                                    variant="link"
                                                    className="text-danger p-0"
                                                    onClick={() => removeFromCart(item.menuItemId)}
                                                >
                                                    Xóa
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Thông tin đặt đơn */}
                <Col lg={5}>
                    <Card className="shadow-sm border-0">
                        <Card.Body className="p-4">
                            <h5 className="fw-bold mb-3">Thông Tin Gọi Món</h5>

                            <Form onSubmit={handleSubmitOrder} autoComplete="off">
                                <Form.Group className="mb-3">
                                    <Form.Label>Bàn phục vụ (*)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ví dụ: T01"
                                        value={tableCode}
                                        onChange={(e) => setTableCode(e.target.value.toUpperCase())}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Họ tên người đặt (*)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Nhập họ và tên của bạn"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Số điện thoại (*)</Form.Label>
                                    <Form.Control
                                        type="tel"
                                        placeholder="Ví dụ: 0912345678"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Ghi chú món ăn</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        placeholder="Ví dụ: Ít cay, mang đồ uống trước..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                </Form.Group>

                                <div className="d-flex justify-content-between align-items-center my-3 pt-3 border-top">
                                    <span className="fs-5">Tổng thanh toán:</span>
                                    <strong className="fs-4 text-danger">
                                        {totalAmount.toLocaleString("vi-VN")} đ
                                    </strong>
                                </div>

                                <Button
                                    type="submit"
                                    variant="success"
                                    size="lg"
                                    className="w-100 fw-bold"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Đang gửi đơn...
                                        </>
                                    ) : (
                                        "Xác Nhận Gọi Món"
                                    )}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default CartPage;
