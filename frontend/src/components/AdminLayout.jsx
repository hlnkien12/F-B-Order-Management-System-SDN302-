import { Container, Nav, Card, Button, Spinner, Alert } from "react-bootstrap";
import { NavLink, Outlet, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminLayout = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Dang kiem tra quyen truy cap...</p>
            </Container>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!["staff", "admin"].includes(user.role)) {
        return (
            <Container className="py-5 text-center" style={{ maxWidth: 520 }}>
                <Alert variant="danger">
                    <h5 className="fw-bold">Khong Co Quyen Truy Cap</h5>
                    <p className="mb-0">
                        Khu vuc nay chi danh cho Nhan vien (Staff) va Quan tri vien (Admin).
                    </p>
                </Alert>
                <Button as={Link} to="/" variant="primary">
                    Quay Ve Thuc Don
                </Button>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <Card className="shadow-sm border-0 mb-4">
                <Card.Body className="p-2">
                    <Nav variant="pills" className="gap-2 flex-wrap">
                        <Nav.Item>
                            <Nav.Link as={NavLink} to="/admin/orders" className="fw-semibold">
                                Bang Don Hang
                            </Nav.Link>
                        </Nav.Item>

                        <Nav.Item>
                            <Nav.Link as={NavLink} to="/admin/menu" className="fw-semibold">
                                Quan Ly Thuc Don
                            </Nav.Link>
                        </Nav.Item>

                        {user.role === "admin" && (
                            <>
                                <Nav.Item>
                                    <Nav.Link as={NavLink} to="/admin/tables" className="fw-semibold">
                                        Ban An va Ma QR
                                    </Nav.Link>
                                </Nav.Item>

                                <Nav.Item>
                                    <Nav.Link as={NavLink} to="/admin/staff" className="fw-semibold">
                                        Quan Ly Nhan Vien
                                    </Nav.Link>
                                </Nav.Item>
                            </>
                        )}
                    </Nav>
                </Card.Body>
            </Card>

            <Outlet />
        </Container>
    );
};

export default AdminLayout;

