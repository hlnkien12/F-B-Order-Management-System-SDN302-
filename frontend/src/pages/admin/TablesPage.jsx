import { useEffect, useState } from "react";
import { Row, Col, Card, Badge, Button, Form, Spinner, Alert } from "react-bootstrap";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

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
            setError(typeof err === "string" ? err : "Khong the tai danh sach ban!");
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
            showNotice("Tao ban moi thanh cong!");
        } catch (err) {
            setError(typeof err === "string" ? err : "Tao ban moi that bai!");
        } finally {
            setCreating(false);
        }
    };

    const handleToggleActive = async (table) => {
        try {
            setError("");
            const res = await axiosClient.put(`/tables/${table._id}`, {
                isActive: !table.isActive
            });
            setTables((prev) => prev.map((t) => (t._id === table._id ? res.data : t)));
            showNotice(`Da cap nhat trang thai [${table.name}]!`);
        } catch (err) {
            setError(typeof err === "string" ? err : "Cap nhat ban that bai!");
        }
    };

    const handleDeleteTable = async (table) => {
        if (!window.confirm(`Ban co chac muon xoa [${table.name} (${table.code})]?`)) return;
        try {
            setError("");
            await axiosClient.delete(`/tables/${table._id}`);
            setTables((prev) => prev.filter((t) => t._id !== table._id));
            showNotice(`Da xoa [${table.name}]!`);
        } catch (err) {
            setError(typeof err === "string" ? err : "Xoa ban that bai!");
        }
    };

    const handleDownloadQR = (code) => {
        const canvas = document.getElementById(`qr-canvas-${code}`);
        if (!canvas) return;
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `QR-Ban-${code}.png`;
        a.click();
    };

    return (
        <div>
            <h4 className="fw-bold mb-3">Quan Ly Ban An va Ma QR ({tables.length} ban)</h4>

            {successMsg && <Alert variant="success" className="py-2">{successMsg}</Alert>}
            {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}

            {/* Form them ban moi */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <h6 className="fw-bold mb-3">Them Ban An Moi</h6>
                    <Form onSubmit={handleCreateTable}>
                        <Row className="g-2 align-items-end">
                            <Col sm={4}>
                                <Form.Label className="small mb-1">Ma ban (*)</Form.Label>
                                <Form.Control
                                    size="sm"
                                    type="text"
                                    placeholder="Vi du: T11"
                                    value={newCode}
                                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                    required
                                />
                            </Col>
                            <Col sm={5}>
                                <Form.Label className="small mb-1">Ten hien thi (*)</Form.Label>
                                <Form.Control
                                    size="sm"
                                    type="text"
                                    placeholder="Vi du: Ban 11"
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
                                    {creating ? "Dang tao..." : "+ Them Ban"}
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
                                                {table.name} ({table.code})
                                            </strong>
                                            <Badge bg={table.isActive ? "success" : "secondary"}>
                                                {table.isActive ? "Hoat dong" : "Tam ngung"}
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
                                                Mo Link
                                            </Button>
                                            <Button
                                                variant="outline-dark"
                                                size="sm"
                                                onClick={() => handleDownloadQR(table.code)}
                                            >
                                                Tai QR
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
                                                {table.isActive ? "Tam Khoa" : "Mo Lai"}
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleDeleteTable(table)}
                                            >
                                                Xoa
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

