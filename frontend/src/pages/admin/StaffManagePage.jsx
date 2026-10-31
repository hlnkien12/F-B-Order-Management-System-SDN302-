import { useEffect, useState } from "react";
import { Card, Table, Badge, Button, Form, Spinner, Alert, Modal } from "react-bootstrap";
import axiosClient from "../../api/axiosClient";

const StaffManagePage = () => {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: ""
    });
    const [creating, setCreating] = useState(false);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await axiosClient.get("/staff");
            setStaffList(res.data || []);
        } catch (err) {
            setError(typeof err === "string" ? err : "Khong the tai danh sach nhan vien!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const showNotice = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(""), 3000);
    };

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        setError("");
        setCreating(true);
        try {
            const res = await axiosClient.post("/staff", {
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                password: formData.password
            });
            const created = {
                ...res.data,
                _id: res.data._id || res.data.id,
                createdAt: new Date().toISOString()
            };
            setStaffList((prev) => [created, ...prev]);
            setShowCreateModal(false);
            setFormData({ name: "", email: "", phone: "", password: "" });
            showNotice("Tao tai khoan nhan vien thanh cong!");
        } catch (err) {
            setError(typeof err === "string" ? err : "Tao tai khoan nhan vien that bai!");
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStatus = async (staff) => {
        const staffId = staff._id || staff.id;
        try {
            setError("");
            const res = await axiosClient.patch(`/staff/${staffId}/status`, {
                isActive: !staff.isActive
            });
            setStaffList((prev) =>
                prev.map((s) =>
                    (s._id || s.id) === staffId ? { ...s, isActive: res.data.isActive } : s
                )
            );
            showNotice(res.message);
        } catch (err) {
            setError(typeof err === "string" ? err : "Doi trang thai tai khoan that bai!");
        }
    };

    const handleDeleteStaff = async (staff) => {
        const staffId = staff._id || staff.id;
        if (!window.confirm(`Ban co chac muon xoa tai khoan nhan vien [${staff.name}]?`)) return;
        try {
            setError("");
            await axiosClient.delete(`/staff/${staffId}`);
            setStaffList((prev) => prev.filter((s) => (s._id || s.id) !== staffId));
            showNotice(`Da xoa tai khoan nhan vien [${staff.name}]!`);
        } catch (err) {
            setError(typeof err === "string" ? err : "Xoa tai khoan nhan vien that bai!");
        }
    };

    return (
        <div>
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                <h4 className="fw-bold mb-0">Quan Ly Nhan Vien ({staffList.length} tai khoan)</h4>
                <Button
                    variant="primary"
                    className="fw-semibold"
                    onClick={() => setShowCreateModal(true)}
                >
                    + Them Nhan Vien Moi
                </Button>
            </div>

            {successMsg && <Alert variant="success" className="py-2">{successMsg}</Alert>}
            {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}

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
                                    <th>Ho va Ten</th>
                                    <th>Email</th>
                                    <th>So Dien Thoai</th>
                                    <th>Trang Thai</th>
                                    <th className="text-end">Thao Tac</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffList.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-4 text-muted">
                                            Chua co tai khoan nhan vien nao.
                                        </td>
                                    </tr>
                                ) : (
                                    staffList.map((staff) => {
                                        const staffId = staff._id || staff.id;
                                        return (
                                            <tr key={staffId}>
                                                <td className="fw-bold">{staff.name}</td>
                                                <td>{staff.email}</td>
                                                <td>{staff.phone}</td>
                                                <td>
                                                    <Badge bg={staff.isActive ? "success" : "danger"}>
                                                        {staff.isActive ? "Dang hoat dong" : "Da bi khoa"}
                                                    </Badge>
                                                </td>
                                                <td className="text-end text-nowrap">
                                                    <Button
                                                        variant={
                                                            staff.isActive
                                                                ? "outline-warning"
                                                                : "outline-success"
                                                        }
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={() => handleToggleStatus(staff)}
                                                    >
                                                        {staff.isActive ? "Khoa Tai Khoan" : "Mo Khoa"}
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleDeleteStaff(staff)}
                                                    >
                                                        Xoa
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {/* Modal Tao Nhan Vien Moi */}
            <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
                <Form onSubmit={handleCreateStaff}>
                    <Modal.Header closeButton>
                        <Modal.Title className="fs-5 fw-bold">
                            Cap Tai Khoan Nhan Vien Moi
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Ho va ten (*)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Vi du: Nguyen Van Thu Ngan"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Email dang nhap (*)</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="Vi du: staff2@shop.com"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>So dien thoai (10 so bat dau bang 0) (*)</Form.Label>
                            <Form.Control
                                type="tel"
                                placeholder="Vi du: 0912345678"
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                }
                                required
                            />
                        </Form.Group>

                        <Form.Group>
                            <Form.Label>Mat khau (*)</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="It nhat 6 ky tu"
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                                required
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowCreateModal(false)}
                        >
                            Huy
                        </Button>
                        <Button type="submit" variant="primary" size="sm" disabled={creating}>
                            {creating ? "Dang tao..." : "Tao Tai Khoan"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default StaffManagePage;

