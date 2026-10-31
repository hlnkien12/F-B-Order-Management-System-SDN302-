import { Container, Nav, Card, Button, Spinner, Alert } from "react-bootstrap";
import { NavLink, Outlet, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminLayout = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Đang kiểm tra quyền truy cập...</p>
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
                    <h5 className="fw-bold">Không Có Quyền Truy Cập</h5>
                    <p className="mb-0">
                        Khu vực này chỉ dành cho Nhân viên (Staff) và Quản trị viên (Admin).
                    </p>
                </Alert>
                <Button as={Link} to="/" variant="primary">
                    Quay Về Thực Đơn
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
                                Bảng Đơn Hàng
                            </Nav.Link>
                        </Nav.Item>

                        <Nav.Item>
                            <Nav.Link as={NavLink} to="/admin/menu" className="fw-semibold">
                                Quản Lý Thực Đơn
                            </Nav.Link>
                        </Nav.Item>

                        {user.role === "admin" && (
                            <>
                                <Nav.Item>
                                    <Nav.Link as={NavLink} to="/admin/tables" className="fw-semibold">
                                        Bàn Ăn & Mã QR
                                    </Nav.Link>
                                </Nav.Item>

                                <Nav.Item>
                                    <Nav.Link as={NavLink} to="/admin/staff" className="fw-semibold">
                                        Quản Lý Nhân Viên
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
