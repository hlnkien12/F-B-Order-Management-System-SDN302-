import { Navbar, Container, Nav, Badge, Button } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const AppNavbar = () => {
    const { user, logout } = useAuth();
    const { totalCount, tableCode, hasActiveOrders } = useCart();
    const navigate = useNavigate();
    const location = useLocation();

    const isAdminRoute = location.pathname.startsWith("/admin");

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    // 1. Giao dien Header rieng cho Dashboard Quan tri vien & Nhan vien (Admin Dashboard)
    if (isAdminRoute) {
        return (
            <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="shadow-sm">
                <Container>
                    <Navbar.Brand as={Link} to="/admin/orders" className="fw-bold">
                        F&B Order - Quản Trị Hệ Thống
                    </Navbar.Brand>

                    <Navbar.Toggle aria-controls="admin-nav" />
                    <Navbar.Collapse id="admin-nav">
                        <Nav className="ms-auto align-items-lg-center gap-2">
                            {user && (
                                <span className="text-light ms-2 small">
                                    Xin chào, <strong>{user.name}</strong> ({user.role})
                                </span>
                            )}
                            <Button variant="outline-light" size="sm" onClick={handleLogout}>
                                Đăng Xuất
                            </Button>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
        );
    }

    // 2. Giao dien Header cho Khach hang tai ban
    return (
        <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="shadow-sm">
            <Container>
                <Navbar.Brand as={Link} to="/" className="fw-bold">
                    F&B Order
                </Navbar.Brand>

                {tableCode && (
                    <Badge bg="warning" text="dark" className="me-auto ms-2 px-2 py-1 fs-6">
                        Bàn: {tableCode}
                    </Badge>
                )}

                <Navbar.Toggle aria-controls="main-nav" />
                <Navbar.Collapse id="main-nav">
                    <Nav className="ms-auto align-items-lg-center gap-2">
                        <Nav.Link as={Link} to="/">
                            Thực Đơn
                        </Nav.Link>

                        <Nav.Link
                            as={Link}
                            to="/cart"
                            className="position-relative me-2 d-inline-flex align-items-center"
                        >
                            <span>Giỏ Hàng</span>
                            {totalCount > 0 && (
                                <Badge bg="danger" pill className="ms-1">
                                    {totalCount}
                                </Badge>
                            )}
                            {hasActiveOrders && (
                                <span
                                    className="d-inline-block rounded-circle bg-warning ms-1"
                                    style={{ width: 9, height: 9 }}
                                    title="Bàn đang có đơn chờ bếp xác nhận hoặc đang chuẩn bị"
                                />
                            )}
                        </Nav.Link>

                        {user ? (
                            <>
                                {["staff", "admin"].includes(user.role) && (
                                    <Button
                                        as={Link}
                                        to="/admin/orders"
                                        variant="outline-warning"
                                        size="sm"
                                        className="fw-bold"
                                    >
                                        Trang Quản Lý
                                    </Button>
                                )}

                                <span className="text-light ms-2 small">
                                    Xin chào, <strong>{user.name}</strong> ({user.role})
                                </span>

                                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                                    Đăng Xuất
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button as={Link} to="/login" variant="outline-light" size="sm">
                                    Đăng Nhập
                                </Button>
                                <Button as={Link} to="/register" variant="primary" size="sm">
                                    Đăng Ký
                                </Button>
                            </>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default AppNavbar;
