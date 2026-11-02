import { useEffect, useState } from "react";
import { Row, Col, Card, Badge, Button, Form, Spinner, Alert } from "react-bootstrap";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { socket } from "../../socket/socket";
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

        const handleTableUpdated = (updatedTable) => {
            if (!updatedTable || !updatedTable._id) return;
            setTables((prev) => {
                const exists = prev.some((t) => String(t._id) === String(updatedTable._id));
                if (exists) {
                    return prev.map((t) =>
                        String(t._id) === String(updatedTable._id) ? updatedTable : t
                    );
                }
                return [...prev, updatedTable].sort((a, b) => a.code.localeCompare(b.code));
            });
        };

        socket.on("table:updated", handleTableUpdated);
        return () => {
            socket.off("table:updated", handleTableUpdated);
        };
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
            const created = res.data || res;
            setTables((prev) => {
                const exists = prev.some((t) => String(t._id) === String(created._id));
                if (exists) return prev;
                return [...prev, created].sort((a, b) => a.code.localeCompare(b.code));
            });
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
            const updated = res.data || res;
            setTables((prev) =>
                prev.map((t) => (String(t._id) === String(table._id) ? updated : t))
            );
            showNotice(
                `Đã ${updated.isActive ? "kích hoạt" : "tạm ngưng"} bàn ${table.code}!`
            );
        } catch (err) {
            setError(typeof err === "string" ? err : "Thao tác thất bại!");
        }
    };

    const handleToggleOccupancy = async (table, nextOccupied) => {
        try {
            const res = await axiosClient.patch(`/tables/${table._id}/occupancy`, {
                isOccupied: nextOccupied
            });
            const updated = res.data || res;
            setTables((prev) =>
                prev.map((t) => (String(t._id) === String(table._id) ? updated : t))
            );
            showNotice(
                updated.isOccupied
                    ? `Đã đánh dấu ${toVietnamese(table.name)} (${table.code}): Đang có khách ngồi!`
                    : `Đã xác nhận khách rời bàn! ${toVietnamese(table.name)} (${table.code}) hiện đã trống.`
            );
        } catch (err) {
            setError(typeof err === "string" ? err : "Cập nhật trạng thái bàn thất bại!");
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

    const occupiedCount = tables.filter((t) => t.isActive && t.isOccupied).length;
    const emptyCount = tables.filter((t) => t.isActive && !t.isOccupied).length;

    return (
        <div>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div>
                    <h4 className="fw-bold mb-1">Quản Lý Bàn Ăn & Mã QR Gọi Món</h4>
                    <div className="small text-muted">
                        Tổng số bàn hoạt động: <strong>{occupiedCount + emptyCount}</strong> | Bàn
                        trống: <strong className="text-success">{emptyCount}</strong> | Đang có
                        khách ngồi: <strong className="text-danger">{occupiedCount}</strong>
                    </div>
                </div>
                <Button variant="outline-primary" size="sm" onClick={fetchTables}>
                    Làm Mới
                </Button>
            </div>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError("")}>
                    {error}
                </Alert>
            )}
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
                        const borderClass = !table.isActive
                            ? "border-secondary opacity-75"
                            : table.isOccupied
                              ? "border-danger border-2"
                              : "border-0";

                        return (
                            <Col key={table._id}>
                                <Card className={`h-100 shadow-sm text-center ${borderClass}`}>
                                    <Card.Body className="d-flex flex-column align-items-center">
                                        <div className="w-100 d-flex justify-content-between align-items-center mb-2">
                                            <strong className="fs-5 text-primary">
                                                {toVietnamese(table.name)} ({table.code})
                                            </strong>
                                            <Badge bg={table.isActive ? "success" : "secondary"}>
                                                {table.isActive ? "Mở phục vụ" : "Tạm ngưng"}
                                            </Badge>
                                        </div>

                                        {/* Trang thai Co khach / Ban trong */}
                                        <div className="w-100 mb-2">
                                            {!table.isActive ? (
                                                <Badge bg="secondary" className="w-100 py-2">
                                                    Bàn đang tạm khóa
                                                </Badge>
                                            ) : table.isOccupied ? (
                                                <Badge bg="danger" className="w-100 py-2 fs-6">
                                                    ĐANG CÓ KHÁCH NGỒI
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    bg="success"
                                                    className="w-100 py-2 bg-opacity-75"
                                                >
                                                    BÀN TRỐNG (SẴN SÀNG)
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="p-2 bg-white border rounded my-2">
                                            <QRCodeCanvas
                                                id={`qr-canvas-${table.code}`}
                                                value={orderUrl}
                                                size={130}
                                                includeMargin={true}
                                            />
                                        </div>

                                        <div className="small text-muted text-break mb-3">
                                            {orderUrl}
                                        </div>

                                        {/* Nut xac nhan Khach da roi ban / Lam trong ban */}
                                        {table.isActive && (
                                            <div className="w-100 mb-2">
                                                {table.isOccupied ? (
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        className="w-100 fw-bold shadow-sm"
                                                        onClick={() =>
                                                            handleToggleOccupancy(table, false)
                                                        }
                                                    >
                                                        Khách Đã Rời Bàn (Làm Trống)
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        className="w-100"
                                                        onClick={() =>
                                                            handleToggleOccupancy(table, true)
                                                        }
                                                    >
                                                        Đánh Dấu Có Khách
                                                    </Button>
                                                )}
                                            </div>
                                        )}

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
