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
            setError(typeof err === "string" ? err : "Không thể tải danh sách nhân viên!");
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
            showNotice("Cấp tài khoản nhân viên mới thành công!");
        } catch (err) {
            setError(typeof err === "string" ? err : "Cấp tài khoản thất bại!");
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStatus = async (staff) => {
        const staffId = staff._id || staff.id;
        try {
            const res = await axiosClient.patch(`/staff/${staffId}/toggle-status`);
            setStaffList((prev) =>
                prev.map((s) => ((s._id || s.id) === staffId ? { ...s, isActive: res.data.isActive } : s))
            );
            showNotice(
                `Đã ${res.data.isActive ? "mở khóa" : "khóa"} tài khoản của ${staff.name}!`
            );
        } catch (err) {
            setError(typeof err === "string" ? err : "Thao tác thất bại!");
        }
    };

    const handleDeleteStaff = async (staff) => {
        const staffId = staff._id || staff.id;
        if (!window.confirm(`Bạn có chắc chắn muốn xóa nhân viên ${staff.name}?`)) {
            return;
        }
        try {
            await axiosClient.delete(`/staff/${staffId}`);
            setStaffList((prev) => prev.filter((s) => (s._id || s.id) !== staffId));
            showNotice(`Đã xóa nhân viên ${staff.name}!`);
        } catch (err) {
            setError(typeof err === "string" ? err : "Xóa nhân viên thất bại!");
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold mb-0">Quản Lý Danh Sách Nhân Viên</h4>
                <div className="d-flex gap-2">
                    <Button variant="outline-primary" size="sm" onClick={fetchStaff}>
                        Làm Mới
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        className="fw-bold"
                        onClick={() => setShowCreateModal(true)}
                    >
                        + Cấp Tài Khoản Mới
                    </Button>
                </div>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
            {successMsg && <Alert variant="success">{successMsg}</Alert>}

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
                                    <th>Họ và Tên</th>
                                    <th>Email</th>
                                    <th>Số Điện Thoại</th>
                                    <th>Trạng Thái</th>
                                    <th className="text-end">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffList.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-4 text-muted">
                                            Chưa có tài khoản nhân viên nào.
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
                                                        {staff.isActive ? "Đang hoạt động" : "Đã bị khóa"}
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
                                                        {staff.isActive ? "Khóa Tài Khoản" : "Mở Khóa"}
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleDeleteStaff(staff)}
                                                    >
                                                        Xóa
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
                <Form onSubmit={handleCreateStaff} autoComplete="off">
                    <Modal.Header closeButton>
                        <Modal.Title className="fs-5 fw-bold">
                            Cấp Tài Khoản Nhân Viên Mới
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Họ và tên (*)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Ví dụ: Nguyễn Văn Thu Ngân"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                autoComplete="off"
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email (*)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="staff@shop.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                autoComplete="off"
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Số điện thoại (*)</Form.Label>
                            <Form.Control
                                type="tel"
                                placeholder="0901234567"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                autoComplete="off"
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Mật khẩu khởi tạo (*)</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Ít nhất 6 ký tự"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                autoComplete="new-password"
                                required
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                            Hủy
                        </Button>
                        <Button variant="primary" type="submit" disabled={creating}>
                            {creating ? "Đang tạo..." : "Tạo Tài Khoản"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default StaffManagePage;
