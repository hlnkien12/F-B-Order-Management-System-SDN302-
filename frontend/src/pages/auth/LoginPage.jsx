import { useState } from "react";
import { Container, Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const userData = await login(email.trim(), password);
            if (["admin", "staff"].includes(userData.role)) {
                navigate("/admin/orders");
            } else {
                navigate("/");
            }
        } catch (err) {
            setError(typeof err === "string" ? err : "Đăng nhập thất bại!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-5" style={{ maxWidth: 440 }}>
            <Card className="shadow-sm border-0">
                <Card.Body className="p-4">
                    <h4 className="fw-bold text-center mb-3">Đăng Nhập</h4>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleSubmit} autoComplete="off">
                        {/* Truong an ngan chan trinh duyet tu dong dien (anti-autofill) */}
                        <input
                            type="text"
                            name="fake_user_prevent_autofill"
                            style={{ display: "none" }}
                            tabIndex="-1"
                            autoComplete="off"
                        />
                        <input
                            type="password"
                            name="fake_password_prevent_autofill"
                            style={{ display: "none" }}
                            tabIndex="-1"
                            autoComplete="new-password"
                        />

                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="text"
                                name="login_account_email"
                                placeholder="Ví dụ: admin@shop.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Mật khẩu</Form.Label>
                            <Form.Control
                                type="password"
                                name="login_account_password"
                                placeholder="Nhập mật khẩu"
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
                            {loading ? <Spinner animation="border" size="sm" /> : "Đăng Nhập"}
                        </Button>

                        <div className="text-center small text-muted">
                            Chưa có tài khoản?{" "}
                            <Link to="/register">Đăng ký ngay</Link>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default LoginPage;
