import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Table, Button, Form, Alert, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import axiosClient from "../../api/axiosClient";

const CartPage = () => {
    const { cartItems, tableCode, setTableCode, updateQuantity, removeFromCart, clearCart, totalAmount } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [note, setNote] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

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

        if (!tableCode) {
            setError("Vui long chon ban truoc khi gui don!");
            return;
        }
        if (cartItems.length === 0) {
            setError("Gio hang dang trong!");
            return;
        }
        if (!customerName.trim()) {
            setError("Vui long nhap ho ten!");
            return;
        }
        const phoneRegex = /^0[0-9]{9}$/;
        if (!phoneRegex.test(customerPhone.trim())) {
            setError("So dien thoai phai du 10 chu so va bat dau bang so 0!");
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

            // Xoa gio hang va chuyen sang trang theo doi don
            clearCart();
            navigate(`/track/${createdOrder._id}`);
        } catch (err) {
            setError(typeof err === "string" ? err : "Gui don that bai!");
        } finally {
            setSubmitting(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <Container className="py-5 text-center">
                <h4 className="fw-bold mb-3">Gio hang cua ban dang trong</h4>
                <p className="text-muted">Hay chon nhung mon an va do uong thom ngon tu thuc don nhe!</p>
                <Button as={Link} to="/" variant="primary">
                    Xem Thuc Don
                </Button>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <h3 className="fw-bold mb-4">Gio Hang Cua Ban</h3>

            {error && <Alert variant="danger">{error}</Alert>}

            <Row className="g-4">
                {/* Danh sach mon */}
                <Col lg={7}>
                    <Card className="shadow-sm border-0">
                        <Card.Body className="p-0">
                            <Table responsive className="align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Mon</th>
                                        <th className="text-center">Gia</th>
                                        <th className="text-center" style={{ width: 140 }}>
                                            So Luong
                                        </th>
                                        <th className="text-end">Thanh Tien</th>
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
                                                    <span className="fw-semibold">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="text-center small">
                                                {item.price.toLocaleString("vi-VN")} d
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
                                                {(item.price * item.quantity).toLocaleString("vi-VN")} d
                                            </td>
                                            <td className="text-center">
                                                <Button
                                                    size="sm"
                                                    variant="link"
                                                    className="text-danger p-0"
                                                    onClick={() => removeFromCart(item.menuItemId)}
                                                >
                                                    Xoa
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Thong tin dat don */}
                <Col lg={5}>
                    <Card className="shadow-sm border-0">
                        <Card.Body className="p-4">
                            <h5 className="fw-bold mb-3">Thong Tin Goi Mon</h5>

                            <Form onSubmit={handleSubmitOrder}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Ban phuc vu (*)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Vi du: T01"
                                        value={tableCode}
                                        onChange={(e) => setTableCode(e.target.value.toUpperCase())}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Ho ten nguoi dat (*)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Nhap ho va ten cua ban"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>So dien thoai (*)</Form.Label>
                                    <Form.Control
                                        type="tel"
                                        placeholder="Vi du: 0912345678"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Ghi chu mon an</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        placeholder="Vi du: It cay, mang do uong truoc..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                </Form.Group>

                                <div className="d-flex justify-content-between align-items-center my-3 pt-3 border-top">
                                    <span className="fs-5">Tong thanh toan:</span>
                                    <strong className="fs-4 text-danger">
                                        {totalAmount.toLocaleString("vi-VN")} d
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
                                            Dang gui don...
                                        </>
                                    ) : (
                                        "Xac Nhan Goi Mon"
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

