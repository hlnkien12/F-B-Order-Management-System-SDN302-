import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

const STATUS_TEXT = {
    pending: "Cho xac nhan",
    confirmed: "Dang chuan bi",
    completed: "Hoan thanh",
    cancelled: "Da huy"
};

const MyOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchMyOrders = async () => {
            try {
                setLoading(true);
                const res = await axiosClient.get("/orders/my");
                setOrders(res.data || []);
            } catch (err) {
                setError(typeof err === "string" ? err : "Khong the lay lich su don!");
            } finally {
                setLoading(false);
            }
        };
        fetchMyOrders();
    }, []);

    return (
        <Container className="py-4">
            <h3 className="fw-bold mb-4">Lich Su Don Hang Cua Ban</h3>

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : orders.length === 0 ? (
                <Card className="text-center p-5 border-0 shadow-sm">
                    <p className="text-muted">Ban chua co don hang nao.</p>
                    <div>
                        <Button as={Link} to="/" variant="primary">
                            Xem Thuc Don
                        </Button>
                    </div>
                </Card>
            ) : (
                <Row className="g-3">
                    {orders.map((ord) => (
                        <Col key={ord._id} md={6}>
                            <Card className="shadow-sm border-0 h-100">
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <strong className="text-primary">{ord.orderCode}</strong>
                                        <Badge
                                            bg={
                                                ord.status === "completed"
                                                    ? "success"
                                                    : ord.status === "cancelled"
                                                    ? "danger"
                                                    : ord.status === "confirmed"
                                                    ? "primary"
                                                    : "warning"
                                            }
                                            text={ord.status === "pending" ? "dark" : "white"}
                                        >
                                            {STATUS_TEXT[ord.status] || ord.status}
                                        </Badge>
                                    </div>
                                    <div className="small text-muted mb-2">
                                        {ord.tableName} - {new Date(ord.createdAt).toLocaleString("vi-VN")}
                                    </div>
                                    <div className="small mb-3">
                                        {ord.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                        <span className="fw-bold text-danger">
                                            {ord.totalAmount.toLocaleString("vi-VN")} d
                                        </span>
                                        <Button
                                            as={Link}
                                            to={`/track/${ord._id}`}
                                            size="sm"
                                            variant="outline-primary"
                                        >
                                            Theo Doi
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </Container>
    );
};

export default MyOrdersPage;

