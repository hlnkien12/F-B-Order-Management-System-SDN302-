import { useEffect, useState } from "react";
import { Container, Card, Badge, Spinner } from "react-bootstrap";

function App() {
    const [health, setHealth] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/health")
            .then((res) => res.json())
            .then((data) => setHealth(data))
            .catch((err) => setError(err.message));
    }, []);

    return (
        <Container className="py-5">
            <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: 560 }}>
                <Card.Body className="p-4 text-center">
                    <h3 className="fw-bold mb-3">He Thong Order Do An va Do Uong</h3>
                    <p className="text-muted">Khoi tao Giai doan P0 (Vite React + Express 5 + MongoDB)</p>

                    {!health && !error && <Spinner animation="border" variant="primary" />}

                    {health && (
                        <div className="mt-3">
                            <Badge bg="success" className="p-2 fs-6">
                                [OK] Da ket noi Backend: {health.message}
                            </Badge>
                        </div>
                    )}

                    {error && (
                        <div className="mt-3">
                            <Badge bg="danger" className="p-2 fs-6">
                                [Loi] Chua ket noi duoc Backend: {error}
                            </Badge>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
}

export default App;