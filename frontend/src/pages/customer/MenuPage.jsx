import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Form, ButtonGroup, Badge, Spinner, Alert } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useCart } from "../../context/CartContext";
import { socket } from "../../socket/socket";
import { toVietnamese, matchVietnameseSearch } from "../../utils/vietnameseDictionary";

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

const MenuPage = () => {
    const [searchParams] = useSearchParams();
    const { tableCode, setTableCode, addToCart } = useCart();

    const [menuItems, setMenuItems] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedType, setSelectedType] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [addedNotice, setAddedNotice] = useState("");

    // 1. Đọc mã bàn từ URL (?table=T01)
    useEffect(() => {
        const tableFromUrl = searchParams.get("table");
        if (tableFromUrl) {
            setTableCode(tableFromUrl.toUpperCase());
        }
    }, [searchParams, setTableCode]);

    // 2. Lấy danh sách bàn và danh sách thực đơn
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [menuRes, tableRes] = await Promise.all([
                    axiosClient.get("/menu-items"),
                    axiosClient.get("/tables")
                ]);
                const mappedMenu = (menuRes.data || []).map((item) => ({
                    ...item,
                    displayName: toVietnamese(item.name),
                    displayDescription: toVietnamese(item.description),
                    image: resolveMenuImage(item)
                }));
                const mappedTables = (tableRes.data || []).map((t) => ({
                    ...t,
                    displayName: toVietnamese(t.name)
                }));
                setMenuItems(mappedMenu);
                setTables(mappedTables);
            } catch (err) {
                setError(typeof err === "string" ? err : "Không thể tải thực đơn!");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 3. Lắng nghe Socket: Khi nhân viên bật/tắt món -> tự động cập nhật realtime
    useEffect(() => {
        const handleMenuUpdated = (data) => {
            setMenuItems((prev) =>
                prev.map((item) =>
                    String(item._id) === String(data.id) ? { ...item, isAvailable: data.isAvailable } : item
                )
            );
        };

        socket.on("menu:updated", handleMenuUpdated);
        return () => {
            socket.off("menu:updated", handleMenuUpdated);
        };
    }, []);

    // 4. Lọc danh sách món và tìm kiếm đa năng (gõ có dấu hay không dấu đều tìm được)
    const filteredItems = menuItems.filter((item) => {
        const matchType = selectedType === "all" || item.type === selectedType;
        const matchSearch =
            matchVietnameseSearch(item.name, searchTerm) ||
            matchVietnameseSearch(item.displayName, searchTerm);
        return matchType && matchSearch;
    });

    const handleAdd = (item) => {
        addToCart(item);
        setAddedNotice(`Đã thêm [${item.displayName}] vào giỏ hàng!`);
        setTimeout(() => setAddedNotice(""), 2000);
    };

    return (
        <Container className="py-4">
            {/* Thông báo thêm món */}
            {addedNotice && (
                <Alert
                    variant="success"
                    className="py-2 text-center position-fixed top-0 start-50 translate-middle-x mt-5 shadow"
                    style={{ zIndex: 1050 }}
                >
                    {addedNotice}
                </Alert>
            )}

            {/* Chọn bàn nếu chưa có */}
            <Card className="mb-4 shadow-sm border-0 bg-white">
                <Card.Body className="p-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                        <span className="text-muted small">Vị trí ngồi: </span>
                        <strong className="fs-5 text-primary">
                            {tableCode ? `Bàn ${tableCode}` : "Chưa chọn bàn"}
                        </strong>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <span className="small text-muted">Chọn / Đổi bàn:</span>
                        <Form.Select
                            size="sm"
                            value={tableCode}
                            onChange={(e) => setTableCode(e.target.value)}
                            style={{ width: 170 }}
                        >
                            <option value="">-- Chọn bàn --</option>
                            {tables.map((t) => (
                                <option key={t._id} value={t.code}>
                                    {t.displayName} ({t.code})
                                </option>
                            ))}
                        </Form.Select>
                    </div>
                </Card.Body>
            </Card>

            {/* Bộ lọc và Tìm kiếm */}
            <Row className="mb-4 g-2">
                <Col md={6}>
                    <ButtonGroup className="w-100">
                        <Button
                            variant={selectedType === "all" ? "primary" : "outline-primary"}
                            onClick={() => setSelectedType("all")}
                        >
                            Tất Cả
                        </Button>
                        <Button
                            variant={selectedType === "food" ? "primary" : "outline-primary"}
                            onClick={() => setSelectedType("food")}
                        >
                            Món Ăn
                        </Button>
                        <Button
                            variant={selectedType === "drink" ? "primary" : "outline-primary"}
                            onClick={() => setSelectedType("drink")}
                        >
                            Đồ Uống
                        </Button>
                    </ButtonGroup>
                </Col>
                <Col md={6}>
                    <Form.Control
                        type="text"
                        placeholder="Tìm kiếm tên món ăn, đồ uống (có dấu hoặc không dấu)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Col>
            </Row>

            {/* Danh sách món ăn */}
            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted">Đang tải thực đơn...</p>
                </div>
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : filteredItems.length === 0 ? (
                <p className="text-center text-muted py-5">Không tìm thấy món nào phù hợp!</p>
            ) : (
                <Row xs={1} sm={2} md={3} lg={4} className="g-4">
                    {filteredItems.map((item) => (
                        <Col key={item._id}>
                            <Card className="h-100 shadow-sm border-0 position-relative">
                                <Card.Img
                                    variant="top"
                                    src={item.image}
                                    alt={item.displayName}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = item.type === "food" ? "/images/pho-bo.jpg" : "/images/tra-sua.jpg";
                                    }}
                                    style={{ height: 180, objectFit: "cover" }}
                                />
                                {!item.isAvailable && (
                                    <Badge bg="danger" className="position-absolute top-0 end-0 m-2 p-2">
                                        Tạm Hết Món
                                    </Badge>
                                )}
                                <Card.Body className="d-flex flex-column">
                                    <div className="d-flex justify-content-between align-items-start mb-1">
                                        <Card.Title className="fs-6 fw-bold mb-0">{item.displayName}</Card.Title>
                                        <Badge bg={item.type === "food" ? "info" : "warning"} text="dark">
                                            {item.type === "food" ? "Món ăn" : "Đồ uống"}
                                        </Badge>
                                    </div>
                                    <Card.Text className="small text-muted mb-2 flex-grow-1" style={{ minHeight: 40 }}>
                                        {item.displayDescription}
                                    </Card.Text>
                                    <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                                        <span className="fw-bold text-danger fs-6">
                                            {item.price.toLocaleString("vi-VN")} đ
                                        </span>
                                        <Button
                                            variant={item.isAvailable ? "primary" : "secondary"}
                                            size="sm"
                                            disabled={!item.isAvailable}
                                            onClick={() => handleAdd(item)}
                                        >
                                            {item.isAvailable ? "+ Thêm vào giỏ" : "Hết hàng"}
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

export default MenuPage;
