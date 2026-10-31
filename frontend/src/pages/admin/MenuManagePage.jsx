import { useEffect, useState } from "react";
import {
    Row,
    Col,
    Card,
    Table,
    Badge,
    Button,
    Form,
    ButtonGroup,
    Spinner,
    Alert,
    Modal
} from "react-bootstrap";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { socket } from "../../socket/socket";

const DISH_IMAGE_MAP = {
    "pho bo": "/images/pho-bo.jpg",
    "bun dau": "/images/bun-dau.jpg",
    "bun cha": "/images/bun-dau.jpg",
    "com tam": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500",
    "banh mi": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500",
    "mi quang": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500",
    "goi cuon": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500",
    "bo luc lac": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500",
    "com chien": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500",
    "ca phe sua": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500",
    "bac xiu": "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500",
    "tra tac": "/images/tra-tac.jpg",
    "tra dao": "/images/tra-tac.jpg",
    "tra sua": "/images/tra-sua.jpg",
    "cam": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500",
    "sinh to bo": "https://images.unsplash.com/photo-1638176066666-ffb2f5d222e9?w=500",
    "matcha": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500",
    "chanh tuyet": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500"
};

const resolveMenuImage = (item) => {
    const lower = (item.name || "").toLowerCase();
    for (const [key, url] of Object.entries(DISH_IMAGE_MAP)) {
        if (lower.includes(key)) return url;
    }
    if (item.image && (item.image.startsWith("/images/") || item.image.startsWith("http"))) {
        return item.image;
    }
    return item.type === "food" ? "/images/pho-bo.jpg" : "/images/tra-sua.jpg";
};

const MenuManagePage = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [filterType, setFilterType] = useState("all");
    const [search, setSearch] = useState("");

    // State cho Modal Them / Sua mon
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        price: "",
        type: "food",
        image: "/images/pho-bo.jpg",
        description: ""
    });
    const [saving, setSaving] = useState(false);

    const fetchMenu = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await axiosClient.get("/menu-items");
            const mapped = (res.data || []).map((item) => ({
                ...item,
                image: resolveMenuImage(item)
            }));
            setItems(mapped);
        } catch (err) {
            setError(typeof err === "string" ? err : "Khong the tai danh sach thuc don!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
    }, []);

    // Lang nghe Socket cap nhat trang thai mon
    useEffect(() => {
        const handleMenuUpdated = (data) => {
            setItems((prev) =>
                prev.map((item) =>
                    String(item._id) === String(data.id)
                        ? { ...item, isAvailable: data.isAvailable }
                        : item
                )
            );
        };
        socket.on("menu:updated", handleMenuUpdated);
        return () => {
            socket.off("menu:updated", handleMenuUpdated);
        };
    }, []);

    const showNotice = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(""), 3000);
    };

    // 1. Bat / Tat con mon hay het mon (Staff & Admin)
    const handleToggleAvailability = async (item) => {
        try {
            setError("");
            const res = await axiosClient.patch(`/menu-items/${item._id}/availability`, {
                isAvailable: !item.isAvailable
            });
            setItems((prev) =>
                prev.map((i) =>
                    i._id === item._id ? { ...i, isAvailable: res.data.isAvailable } : i
                )
            );
            showNotice(res.message);
        } catch (err) {
            setError(typeof err === "string" ? err : "Doi trang thai mon that bai!");
        }
    };

    // 2. Mo Modal Them moi
    const handleOpenAdd = () => {
        setEditingItem(null);
        setFormData({
            name: "",
            price: "",
            type: "food",
            image: "/images/pho-bo.jpg",
            description: ""
        });
        setShowModal(true);
    };

    // 3. Mo Modal Sua mon
    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            price: String(item.price),
            type: item.type,
            image: item.image || "/images/pho-bo.jpg",
            description: item.description || ""
        });
        setShowModal(true);
    };

    // 4. Luu Them / Sua (Chi Admin)
    const handleSaveItem = async (e) => {
        e.preventDefault();
        setError("");
        setSaving(true);
        try {
            const payload = {
                name: formData.name.trim(),
                price: Number(formData.price),
                type: formData.type,
                image: formData.image.trim() || "/images/pho-bo.jpg",
                description: formData.description.trim()
            };

            if (editingItem) {
                const res = await axiosClient.put(`/menu-items/${editingItem._id}`, payload);
                setItems((prev) =>
                    prev.map((i) => (i._id === editingItem._id ? res.data : i))
                );
                showNotice("Cap nhat mon thanh cong!");
            } else {
                const res = await axiosClient.post("/menu-items", payload);
                setItems((prev) => [res.data, ...prev]);
                showNotice("Them mon moi thanh cong!");
            }
            setShowModal(false);
        } catch (err) {
            setError(typeof err === "string" ? err : "Luu thong tin mon that bai!");
        } finally {
            setSaving(false);
        }
    };

    // 5. Xoa mem mon (Chi Admin)
    const handleDeleteItem = async (item) => {
        if (!window.confirm(`Ban co chac chan muon xoa mon [${item.name}] khoi thuc don?`)) {
            return;
        }
        try {
            setError("");
            await axiosClient.delete(`/menu-items/${item._id}`);
            setItems((prev) => prev.filter((i) => i._id !== item._id));
            showNotice(`Da xoa mon [${item.name}] thanh cong!`);
        } catch (err) {
            setError(typeof err === "string" ? err : "Xoa mon that bai!");
        }
    };

    const filteredItems = items.filter((item) => {
        const matchType = filterType === "all" || item.type === filterType;
        const matchSearch = item.name.toLowerCase().includes(search.toLowerCase().trim());
        return matchType && matchSearch;
    });

    return (
        <div>
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                <h4 className="fw-bold mb-0">Quan Ly Thuc Don ({items.length} mon)</h4>
                {isAdmin && (
                    <Button variant="primary" onClick={handleOpenAdd} className="fw-semibold">
                        + Them Mon Moi
                    </Button>
                )}
            </div>

            {successMsg && <Alert variant="success" className="py-2">{successMsg}</Alert>}
            {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}

            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Row className="g-2">
                        <Col md={5}>
                            <ButtonGroup className="w-100">
                                <Button
                                    variant={filterType === "all" ? "dark" : "outline-dark"}
                                    size="sm"
                                    onClick={() => setFilterType("all")}
                                >
                                    Tat Ca
                                </Button>
                                <Button
                                    variant={filterType === "food" ? "dark" : "outline-dark"}
                                    size="sm"
                                    onClick={() => setFilterType("food")}
                                >
                                    Mon An
                                </Button>
                                <Button
                                    variant={filterType === "drink" ? "dark" : "outline-dark"}
                                    size="sm"
                                    onClick={() => setFilterType("drink")}
                                >
                                    Do Uong
                                </Button>
                            </ButtonGroup>
                        </Col>
                        <Col md={7}>
                            <Form.Control
                                size="sm"
                                type="text"
                                placeholder="Tim kiem ten mon..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : (
                <Card className="border-0 shadow-sm">
                    <Card.Body className="p-0">
                        <Table responsive hover className="align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Mon</th>
                                    <th>Phan Loai</th>
                                    <th>Gia Ban</th>
                                    <th>Trang Thai</th>
                                    <th className="text-end">Thao Tac</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <tr key={item._id}>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <img
                                                    src={item.image || "/images/pho-bo.jpg"}
                                                    alt={item.name}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src =
                                                            item.type === "food"
                                                                ? "/images/pho-bo.jpg"
                                                                : "/images/tra-sua.jpg";
                                                    }}
                                                    style={{
                                                        width: 52,
                                                        height: 52,
                                                        objectFit: "cover",
                                                        borderRadius: 8
                                                    }}
                                                />
                                                <div>
                                                    <div className="fw-bold">{item.name}</div>
                                                    <div className="small text-muted">
                                                        {item.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <Badge
                                                bg={item.type === "food" ? "info" : "warning"}
                                                text="dark"
                                            >
                                                {item.type === "food" ? "Mon an" : "Do uong"}
                                            </Badge>
                                        </td>
                                        <td className="fw-bold text-danger">
                                            {item.price.toLocaleString("vi-VN")} d
                                        </td>
                                        <td>
                                            <Badge bg={item.isAvailable ? "success" : "danger"}>
                                                {item.isAvailable ? "Con mon" : "Tam het"}
                                            </Badge>
                                        </td>
                                        <td className="text-end text-nowrap">
                                            <Button
                                                variant={
                                                    item.isAvailable
                                                        ? "outline-warning"
                                                        : "outline-success"
                                                }
                                                size="sm"
                                                className="me-2"
                                                onClick={() => handleToggleAvailability(item)}
                                            >
                                                {item.isAvailable ? "Bao Het Mon" : "Mo Ban Lai"}
                                            </Button>

                                            {isAdmin && (
                                                <>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={() => handleOpenEdit(item)}
                                                    >
                                                        Sua
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleDeleteItem(item)}
                                                    >
                                                        Xoa
                                                    </Button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {/* Modal Them / Sua Mon */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Form onSubmit={handleSaveItem}>
                    <Modal.Header closeButton>
                        <Modal.Title className="fs-5 fw-bold">
                            {editingItem ? "Cap Nhat Mon" : "Them Mon Moi"}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Ten mon (*)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Vi du: Pho Bo Dac Biet"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                required
                            />
                        </Form.Group>

                        <Row className="mb-3">
                            <Col sm={6}>
                                <Form.Group>
                                    <Form.Label>Gia ban (VND) (*)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        step="1000"
                                        placeholder="Vi du: 55000"
                                        value={formData.price}
                                        onChange={(e) =>
                                            setFormData({ ...formData, price: e.target.value })
                                        }
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col sm={6}>
                                <Form.Group>
                                    <Form.Label>Phan loai (*)</Form.Label>
                                    <Form.Select
                                        value={formData.type}
                                        onChange={(e) => {
                                            const nextType = e.target.value;
                                            setFormData({
                                                ...formData,
                                                type: nextType,
                                                image:
                                                    nextType === "food"
                                                        ? "/images/pho-bo.jpg"
                                                        : "/images/tra-sua.jpg"
                                            });
                                        }}
                                    >
                                        <option value="food">Mon an (food)</option>
                                        <option value="drink">Do uong (drink)</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Duong dan Hinh anh</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="/images/... hoac https://images.unsplash.com/..."
                                value={formData.image}
                                onChange={(e) =>
                                    setFormData({ ...formData, image: e.target.value })
                                }
                            />
                            <div className="d-flex flex-wrap gap-1 mt-2">
                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() =>
                                        setFormData({ ...formData, image: "/images/pho-bo.jpg" })
                                    }
                                >
                                    Pho Bo
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() =>
                                        setFormData({ ...formData, image: "/images/bun-dau.jpg" })
                                    }
                                >
                                    Bun Dau
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() =>
                                        setFormData({
                                            ...formData,
                                            image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500"
                                        })
                                    }
                                >
                                    Com Tam
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() =>
                                        setFormData({
                                            ...formData,
                                            image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500"
                                        })
                                    }
                                >
                                    Banh Mi
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() =>
                                        setFormData({ ...formData, image: "/images/tra-tac.jpg" })
                                    }
                                >
                                    Tra Tac
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() =>
                                        setFormData({ ...formData, image: "/images/tra-sua.jpg" })
                                    }
                                >
                                    Tra Sua
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() =>
                                        setFormData({
                                            ...formData,
                                            image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500"
                                        })
                                    }
                                >
                                    Ca Phe Sua
                                </Button>
                            </div>
                        </Form.Group>

                        <Form.Group>
                            <Form.Label>Mo ta chi tiet</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="Mo ta huong vi, thanh phan..."
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>
                            Huy
                        </Button>
                        <Button type="submit" variant="primary" size="sm" disabled={saving}>
                            {saving ? "Dang luu..." : "Luu Thong Tin"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default MenuManagePage;
