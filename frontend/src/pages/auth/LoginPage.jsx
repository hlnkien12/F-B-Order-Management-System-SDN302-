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
            // Neu la admin hoac staff thi chuyen sang trang quan ly, con lai ve thuc don
            if (["admin", "staff"].includes(userData.role)) {
                navigate("/admin/orders");
            } else {
                navigate("/");
            }
        } catch (err) {
            setError(typeof err === "string" ? err : "Dang nhap that bai!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-5" style={{ maxWidth: 440 }}>
            <Card className="shadow-sm border-0">
                <Card.Body className="p-4">
                    <h4 className="fw-bold text-center mb-3">Dang Nhap</h4>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="Vi du: admin@shop.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Mat khau</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Nhap mat khau"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-100 fw-bold mb-3"
                            disabled={loading}
                        >
                            {loading ? <Spinner animation="border" size="sm" /> : "Dang Nhap"}
                        </Button>

                        <div className="text-center small text-muted">
                            Chua co tai khoan? <Link to="/register">Dang ky ngay</Link>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default LoginPage;

