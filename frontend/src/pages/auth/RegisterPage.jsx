import { useState } from "react";
import { Container, Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const RegisterPage = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const phoneRegex = /^0[0-9]{9}$/;
        if (!phoneRegex.test(phone.trim())) {
            setError("Số điện thoại phải đủ 10 chữ số và bắt đầu bằng số 0!");
            return;
        }
        if (password.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự!");
            return;
        }

        setLoading(true);
        try {
            await register({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                password
            });
            navigate("/login");
        } catch (err) {
            setError(typeof err === "string" ? err : "Đăng ký thất bại!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-5" style={{ maxWidth: 440 }}>
            <Card className="shadow-sm border-0">
                <Card.Body className="p-4">
                    <h4 className="fw-bold text-center mb-3">Đăng Ký Tài Khoản</h4>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleSubmit} autoComplete="off">
                        {/* Truong an ngan chan trinh duyet tu dong dien (anti-autofill) */}
                        <input
                            type="text"
                            name="fake_user_reg_prevent_autofill"
                            style={{ display: "none" }}
                            tabIndex="-1"
                            autoComplete="off"
                        />
                        <input
                            type="password"
                            name="fake_password_reg_prevent_autofill"
                            style={{ display: "none" }}
                            tabIndex="-1"
                            autoComplete="new-password"
                        />

                        <Form.Group className="mb-3">
                            <Form.Label>Họ tên (*)</Form.Label>
                            <Form.Control
                                type="text"
                                name="register_user_name"
                                placeholder="Nguyễn Văn A"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="off"
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Email (*)</Form.Label>
                            <Form.Control
                                type="text"
                                name="register_user_email"
                                placeholder="email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="off"
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Số điện thoại (*)</Form.Label>
                            <Form.Control
                                type="tel"
                                name="register_user_phone"
                                placeholder="0912345678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                autoComplete="off"
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Mật khẩu (*)</Form.Label>
                            <Form.Control
                                type="password"
                                name="register_user_password"
                                placeholder="Ít nhất 6 ký tự"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                required
                            />
                        </Form.Group>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-100 fw-bold mb-3"
                            disabled={loading}
                        >
                            {loading ? <Spinner animation="border" size="sm" /> : "Đăng Ký"}
                        </Button>

                        <div className="text-center small text-muted">
                            Đã có tài khoản?{" "}
                            <Link to="/login">Đăng nhập ngay</Link>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default RegisterPage;
