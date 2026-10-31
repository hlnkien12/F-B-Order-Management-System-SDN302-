import { Navbar, Container, Nav, Badge, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const AppNavbar = () => {
    const { user, logout } = useAuth();
    const { totalCount, tableCode } = useCart();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    return (
        <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="shadow-sm">
            <Container>
                <Navbar.Brand as={Link} to="/" className="fw-bold">
                    F&B Order
                </Navbar.Brand>

                {tableCode && (
                    <Badge bg="warning" text="dark" className="me-auto ms-2 px-2 py-1 fs-6">
                        Ban: {tableCode}
                    </Badge>
                )}

                <Navbar.Toggle aria-controls="main-nav" />
                <Navbar.Collapse id="main-nav">
                    <Nav className="ms-auto align-items-lg-center gap-2">
                        <Nav.Link as={Link} to="/">
                            Thuc Don
                        </Nav.Link>

                        <Nav.Link as={Link} to="/cart" className="position-relative me-2">
                            Gio Hang
                            {totalCount > 0 && (
                                <Badge bg="danger" pill className="ms-1">
                                    {totalCount}
                                </Badge>
                            )}
                        </Nav.Link>

                        {user ? (
                            <>
                                <Nav.Link as={Link} to="/my-orders">
                                    Don Cua Toi
                                </Nav.Link>

                                {["staff", "admin"].includes(user.role) && (
                                    <Button
                                        as={Link}
                                        to="/admin/orders"
                                        variant="outline-warning"
                                        size="sm"
                                        className="fw-bold"
                                    >
                                        Trang Quan Ly
                                    </Button>
                                )}

                                <span className="text-light ms-2 small">
                                    Xin chao, <strong>{user.name}</strong> ({user.role})
                                </span>

                                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                                    Dang Xuat
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button as={Link} to="/login" variant="outline-light" size="sm">
                                    Dang Nhap
                                </Button>
                                <Button as={Link} to="/register" variant="primary" size="sm">
                                    Dang Ky
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

