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
            setError("So dien thoai phai du 10 chu so va bat dau bang so 0!");
            return;
        }
        if (password.length < 6) {
            setError("Mat khau phai co it nhat 6 ky tu!");
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
            setError(typeof err === "string" ? err : "Dang ky that bai!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-5" style={{ maxWidth: 440 }}>
            <Card className="shadow-sm border-0">
                <Card.Body className="p-4">
                    <h4 className="fw-bold text-center mb-3">Dang Ky Tai Khoan</h4>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Ho ten (*)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Nguyen Van A"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Email (*)</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>So dien thoai (*)</Form.Label>
                            <Form.Control
                                type="tel"
                                placeholder="0912345678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Mat khau (*)</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="It nhat 6 ky tu"
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
                            {loading ? <Spinner animation="border" size="sm" /> : "Tao Tai Khoan"}
                        </Button>

                        <div className="text-center small text-muted">
                            Da co tai khoan? <Link to="/login">Dang nhap</Link>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default RegisterPage;

