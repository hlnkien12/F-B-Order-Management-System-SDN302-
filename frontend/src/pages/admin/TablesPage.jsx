import { useEffect, useState } from "react";
import { Row, Col, Card, Badge, Button, Form, Spinner, Alert } from "react-bootstrap";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toVietnamese } from "../../utils/vietnameseDictionary";

const TablesPage = () => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [newCode, setNewCode] = useState("");
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);

    const fetchTables = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await axiosClient.get("/tables");
            setTables(res.data || []);
        } catch (err) {
            setError(typeof err === "string" ? err : "Không thể tải danh sách bàn!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    const showNotice = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(""), 3000);
    };

    const handleCreateTable = async (e) => {
        e.preventDefault();
        setError("");
        setCreating(true);
        try {
            const res = await axiosClient.post("/tables", {
                code: newCode.trim().toUpperCase(),
                name: newName.trim()
            });
            setTables((prev) => [...prev, res.data]);
            setNewCode("");
            setNewName("");
            showNotice("Tạo bàn mới thành công!");
        } catch (err) {
            setError(typeof err === "string" ? err : "Tạo bàn mới thất bại!");
        } finally {
            setCreating(false);
        }
    };

    const handleToggleActive = async (table) => {
        try {
            const res = await axiosClient.patch(`/tables/${table._id}/toggle-active`);
            setTables((prev) =>
                prev.map((t) => (t._id === table._id ? { ...t, isActive: res.data.isActive } : t))
            );
            showNotice(
                `Đã ${res.data.isActive ? "kích hoạt" : "tạm ngưng"} bàn ${table.code}!`
            );
        } catch (err) {
            setError(typeof err === "string" ? err : "Thao tác thất bại!");
        }
    };

    const handleDeleteTable = async (table) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa bàn ${table.name} (${table.code})?`)) {
            return;
        }
        try {
            await axiosClient.delete(`/tables/${table._id}`);
            setTables((prev) => prev.filter((t) => t._id !== table._id));
            showNotice(`Đã xóa bàn ${table.code}!`);
        } catch (err) {
            setError(typeof err === "string" ? err : "Xóa bàn thất bại!");
        }
    };

    const handleDownloadQR = (code) => {
        const canvas = document.getElementById(`qr-canvas-${code}`);
        if (!canvas) return;
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `QR-${code}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold mb-0">Quản Lý Bàn Ăn & Mã QR Gọi Món</h4>
                <Button variant="outline-primary" size="sm" onClick={fetchTables}>
                    Làm Mới
                </Button>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
            {successMsg && <Alert variant="success">{successMsg}</Alert>}

            {/* Form tao ban moi */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <h6 className="fw-bold mb-3">Thêm Bàn Ăn Mới</h6>
                    <Form onSubmit={handleCreateTable}>
                        <Row className="g-2">
                            <Col sm={4}>
                                <Form.Control
                                    size="sm"
                                    type="text"
                                    placeholder="Mã bàn (Ví dụ: T11)"
                                    value={newCode}
                                    onChange={(e) => setNewCode(e.target.value)}
                                    required
                                />
                            </Col>
                            <Col sm={5}>
                                <Form.Control
                                    size="sm"
                                    type="text"
                                    placeholder="Tên bàn (Ví dụ: Bàn 11)"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    required
                                />
                            </Col>
                            <Col sm={3}>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    className="w-100 fw-semibold"
                                    disabled={creating}
                                >
                                    {creating ? "Đang tạo..." : "+ Thêm Bàn"}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {/* Danh sach ban va QR */}
            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : (
                <Row xs={1} sm={2} md={3} lg={4} className="g-3">
                    {tables.map((table) => {
                        const orderUrl = `${window.location.origin}/?table=${table.code}`;
                        return (
                            <Col key={table._id}>
                                <Card className="h-100 border-0 shadow-sm text-center">
                                    <Card.Body className="d-flex flex-column align-items-center">
                                        <div className="w-100 d-flex justify-content-between align-items-center mb-2">
                                            <strong className="fs-5 text-primary">
                                                {toVietnamese(table.name)} ({table.code})
                                            </strong>
                                            <Badge bg={table.isActive ? "success" : "secondary"}>
                                                {table.isActive ? "Hoạt động" : "Tạm ngưng"}
                                            </Badge>
                                        </div>

                                        <div className="p-2 bg-white border rounded my-2">
                                            <QRCodeCanvas
                                                id={`qr-canvas-${table.code}`}
                                                value={orderUrl}
                                                size={140}
                                                includeMargin={true}
                                            />
                                        </div>

                                        <div className="small text-muted text-break mb-3">
                                            {orderUrl}
                                        </div>

                                        <div className="d-flex flex-wrap justify-content-center gap-2 mt-auto w-100">
                                            <Button
                                                as={Link}
                                                to={`/?table=${table.code}`}
                                                variant="outline-primary"
                                                size="sm"
                                            >
                                                Mở Link
                                            </Button>
                                            <Button
                                                variant="outline-dark"
                                                size="sm"
                                                onClick={() => handleDownloadQR(table.code)}
                                            >
                                                Tải QR
                                            </Button>
                                            <Button
                                                variant={
                                                    table.isActive
                                                        ? "outline-warning"
                                                        : "outline-success"
                                                }
                                                size="sm"
                                                onClick={() => handleToggleActive(table)}
                                            >
                                                {table.isActive ? "Tạm Khóa" : "Mở Lại"}
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleDeleteTable(table)}
                                            >
                                                Xóa
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}
        </div>
    );
};

export default TablesPage;
