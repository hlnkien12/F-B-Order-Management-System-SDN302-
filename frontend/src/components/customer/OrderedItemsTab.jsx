import { useState, useEffect } from "react";
import {
    Row,
    Col,
    Card,
    Badge,
    Table,
    Button,
    Spinner,
    Alert,
    ProgressBar,
    Form
} from "react-bootstrap";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { toVietnamese } from "../../utils/vietnameseDictionary";

const STATUS_MAP = {
    pending: { label: "Chờ quán xác nhận", variant: "warning", progress: 20 },
    confirmed: { label: "Quán đã nhận, đang làm món", variant: "primary", progress: 50 },
    served: { label: "Đã lên món / Đang dùng bữa", variant: "info", progress: 80 },
    completed: { label: "Đã thanh toán hoàn tất", variant: "success", progress: 100 },
    cancelled: { label: "Đơn đã bị hủy", variant: "danger", progress: 100 }
};

const OrderedItemsTab = ({ hideEmptyState = false }) => {
    const { user } = useAuth();
    const {
        sessionOrders,
        setSessionOrders,
        ordersLoading,
        ordersError,
        refreshSessionOrders,
        restoreItemsToCart,
        clearGuestOrders
    } = useCart();

    const [cancellingId, setCancellingId] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [requestingPayment, setRequestingPayment] = useState(false);
    const [paymentNotice, setPaymentNotice] = useState("");
    const [countdown, setCountdown] = useState(60);

    useEffect(() => {
        refreshSessionOrders();
    }, [refreshSessionOrders]);

    const validOrders = sessionOrders.filter((ord) => ord.status !== "cancelled");
    const payableOrders = sessionOrders.filter(
        (ord) => ord.status === "confirmed" || ord.status === "served"
    );
    const pendingOrders = sessionOrders.filter((ord) => ord.status === "pending");
    const isAllPaidAndDone =
        validOrders.length > 0 &&
        validOrders.every((ord) => ord.status === "completed") &&
        pendingOrders.length === 0;

    // Lop 1: Tu dong dem nguoc 60 giay va don phien khi tat ca don da thanh toan hoan tat
    useEffect(() => {
        if (!isAllPaidAndDone) {
            setCountdown(60);
            return;
        }

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    clearGuestOrders();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isAllPaidAndDone, clearGuestOrders]);

    const handleCancelOrder = async (ord) => {
        const confirmCancel = window.confirm(
            `Bạn có chắc chắn muốn hủy đơn ${ord.orderCode} không?`
        );
        if (!confirmCancel) return;

        try {
            setCancellingId(ord._id);
            const res = await axiosClient.post(`/orders/${ord._id}/cancel`, {
                reason: "Khách hàng tự hủy khi đang chờ xác nhận"
            });
            const updated = res.data?.data || res.data;

            setSessionOrders((prev) =>
                prev.map((item) => (String(item._id) === String(ord._id) ? updated : item))
            );

            const shouldRestore = window.confirm(
                "Đơn hàng đã được hủy thành công!\n\nBạn có muốn nạp lại các món này vào giỏ hàng để chỉnh sửa và đặt lại không?"
            );
            if (shouldRestore) {
                restoreItemsToCart(ord.items);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        } catch (err) {
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                (typeof err === "string" ? err : "Không thể hủy đơn hàng!");
            alert(msg);
        } finally {
            setCancellingId(null);
        }
    };

    const handleRequestPayment = async () => {
        if (payableOrders.length === 0) return;
        try {
            setRequestingPayment(true);
            setPaymentNotice("");
            const orderIds = payableOrders.map((o) => o._id);
            await axiosClient.post("/orders/request-payment", {
                orderIds,
                paymentMethod
            });

            setSessionOrders((prev) =>
                prev.map((ord) =>
                    orderIds.some((id) => String(id) === String(ord._id))
                        ? { ...ord, paymentRequested: true, paymentMethod }
                        : ord
                )
            );
            setPaymentNotice(
                `Đã gửi yêu cầu thanh toán (${
                    paymentMethod === "transfer" ? "Chuyển khoản" : "Tiền mặt"
                }) tới thu ngân. Vui lòng đợi nhân viên xác nhận!`
            );
        } catch (err) {
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                (typeof err === "string" ? err : "Gửi yêu cầu thanh toán thất bại!");
            alert(msg);
        } finally {
            setRequestingPayment(false);
        }
    };

    const sessionTotalAmount = validOrders.reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);
    const unpaidAmount = sessionOrders
        .filter((ord) => ["pending", "confirmed", "served"].includes(ord.status))
        .reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);

    const hasRequestedPayment =
        payableOrders.length > 0 && payableOrders.every((ord) => ord.paymentRequested);
    const requestedMethodLabel =
        payableOrders.find((ord) => ord.paymentRequested)?.paymentMethod === "transfer"
            ? "Chuyển khoản"
            : "Tiền mặt";

    if (ordersLoading && sessionOrders.length === 0) {
        if (hideEmptyState) return null;
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Đang tải danh sách đơn hàng...</p>
            </div>
        );
    }

    if (sessionOrders.length === 0 && hideEmptyState) {
        return null;
    }

    return (
        <div>
            {!user && sessionOrders.length > 0 && (
                <Alert
                    variant="info"
                    className="d-flex justify-content-between align-items-center py-2 mb-3"
                >
                    <span className="small">
                        Đang hiển thị các đơn gọi món hôm nay trên thiết bị này (Khách vãng lai).
                    </span>
                    <Button
                        as={Link}
                        to="/login"
                        variant="outline-primary"
                        size="sm"
                        className="ms-2"
                    >
                        Đăng Nhập
                    </Button>
                </Alert>
            )}

            {ordersError && <Alert variant="danger">{ordersError}</Alert>}

            {/* Thong bao da thanh toan hoan tat + Dem nguoc tu dong don phien */}
            {isAllPaidAndDone && (
                <Alert variant="success" className="shadow-sm border-success p-4 mb-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div>
                            <h5 className="fw-bold mb-1">
                                Đã thanh toán hoàn tất! Cảm ơn quý khách đã dùng bữa tại quán.
                            </h5>
                            <div className="small">
                                Phiên gọi món trên thiết bị sẽ tự động làm mới sau{" "}
                                <strong>{countdown} giây</strong> (hoặc tự động làm mới ngay khi bạn
                                chọn món mới).
                            </div>
                        </div>
                        <Button
                            variant="success"
                            className="fw-bold"
                            onClick={clearGuestOrders}
                        >
                            Hoàn Tất / Đặt Lượt Mới
                        </Button>
                    </div>
                </Alert>
            )}

            {paymentNotice && (
                <Alert
                    variant="warning"
                    dismissible
                    onClose={() => setPaymentNotice("")}
                    className="fw-semibold"
                >
                    {paymentNotice}
                </Alert>
            )}

            {sessionOrders.length === 0 ? (
                <Card className="text-center p-5 border-0 shadow-sm">
                    <h5 className="fw-bold mb-2">Bạn chưa có đơn hàng nào hôm nay</h5>
                    <p className="text-muted mb-4">
                        Hãy chọn món ăn và đồ uống từ thực đơn để gửi đơn cho nhà bếp nhé!
                    </p>
                    <div className="d-flex justify-content-center gap-2">
                        <Button as={Link} to="/" variant="primary">
                            + Chọn Thêm Món
                        </Button>
                    </div>
                </Card>
            ) : (
                <>
                    {/* Thanh tong hop tam tinh cua ban & Nut Goi Thanh Toan */}
                    <Card className="shadow-sm border-0 mb-4 bg-white">
                        <Card.Body className="py-3">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                                <div>
                                    <div className="text-muted small">
                                        Tổng số đợt gọi món hôm nay
                                    </div>
                                    <div className="fw-bold fs-5">
                                        {sessionOrders.length} đơn ({validOrders.length} đơn hợp lệ)
                                    </div>
                                </div>
                                <div className="text-end">
                                    <div className="text-muted small">
                                        {isAllPaidAndDone
                                            ? "Tổng hóa đơn đã thanh toán"
                                            : "Tổng tạm tính cần thanh toán"}
                                    </div>
                                    <div
                                        className={`fw-bold fs-4 ${
                                            isAllPaidAndDone ? "text-success" : "text-danger"
                                        }`}
                                    >
                                        {(isAllPaidAndDone
                                            ? sessionTotalAmount
                                            : unpaidAmount
                                        ).toLocaleString("vi-VN")}{" "}
                                        đ
                                    </div>
                                </div>
                            </div>

                            {/* Khu vuc Goi Thanh Toan khi co don confirmed hoac served */}
                            {payableOrders.length > 0 && (
                                <div className="border-top mt-3 pt-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
                                    {hasRequestedPayment ? (
                                        <div className="text-warning-emphasis fw-semibold small bg-warning-subtle px-3 py-2 rounded border border-warning flex-grow-1">
                                            Đã gọi nhân viên thanh toán ({requestedMethodLabel}). Vui
                                            lòng đợi thu ngân xác nhận...
                                        </div>
                                    ) : (
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <span className="small fw-semibold">
                                                Hình thức thanh toán:
                                            </span>
                                            <Form.Select
                                                size="sm"
                                                style={{ width: 200 }}
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                            >
                                                <option value="cash">Tiền mặt tại bàn</option>
                                                <option value="transfer">
                                                    Chuyển khoản ngân hàng
                                                </option>
                                            </Form.Select>
                                        </div>
                                    )}

                                    <Button
                                        variant={hasRequestedPayment ? "outline-warning" : "danger"}
                                        size="sm"
                                        className="fw-bold px-3 py-2"
                                        onClick={handleRequestPayment}
                                        disabled={requestingPayment}
                                    >
                                        {requestingPayment ? (
                                            <>
                                                <Spinner
                                                    animation="border"
                                                    size="sm"
                                                    className="me-1"
                                                />
                                                Đang gửi...
                                            </>
                                        ) : hasRequestedPayment ? (
                                            "Gửi Lại Yêu Cầu Thanh Toán"
                                        ) : (
                                            "Gọi Thanh Toán"
                                        )}
                                    </Button>
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    <Row className="g-4">
                        {sessionOrders.map((ord) => {
                            const currentStatus = STATUS_MAP[ord.status] || {
                                label: ord.status,
                                variant: "secondary",
                                progress: 10
                            };

                            return (
                                <Col key={ord._id} lg={6}>
                                    <Card className="shadow-sm border-0 h-100">
                                        <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                            <div>
                                                <span className="text-muted small">Mã đơn: </span>
                                                <strong className="text-primary fs-6">
                                                    {ord.orderCode}
                                                </strong>
                                                <span className="ms-2 badge bg-dark fw-normal">
                                                    {toVietnamese(ord.tableName)}
                                                </span>
                                            </div>
                                            <Badge
                                                bg={currentStatus.variant}
                                                text={
                                                    ["pending", "served"].includes(ord.status)
                                                        ? "dark"
                                                        : "white"
                                                }
                                                className="px-2 py-1"
                                            >
                                                {currentStatus.label}
                                            </Badge>
                                        </Card.Header>

                                        <Card.Body className="d-flex flex-column">
                                            <div className="mb-3">
                                                <ProgressBar
                                                    now={currentStatus.progress}
                                                    variant={currentStatus.variant}
                                                    animated={["pending", "confirmed"].includes(
                                                        ord.status
                                                    )}
                                                    style={{ height: 8 }}
                                                />
                                                <div className="d-flex justify-content-between small text-muted mt-1">
                                                    <span>1. Đã gửi</span>
                                                    <span>2. Đang làm</span>
                                                    <span>3. Đã phục vụ</span>
                                                    <span>4. Đã thanh toán</span>
                                                </div>
                                            </div>

                                            {ord.paymentRequested &&
                                                ord.status !== "completed" &&
                                                ord.status !== "cancelled" && (
                                                    <div className="small bg-warning-subtle text-dark border border-warning rounded px-2 py-1 mb-2 fw-semibold">
                                                        Đang chờ thu ngân xác nhận thanh toán (
                                                        {ord.paymentMethod === "transfer"
                                                            ? "Chuyển khoản"
                                                            : "Tiền mặt"}
                                                        )
                                                    </div>
                                                )}

                                            <div className="small text-muted mb-2">
                                                <div>
                                                    <strong>Thời gian đặt:</strong>{" "}
                                                    {new Date(ord.createdAt).toLocaleString("vi-VN")}
                                                </div>
                                                {ord.note && (
                                                    <div className="text-danger">
                                                        <strong>Ghi chú:</strong> {ord.note}
                                                    </div>
                                                )}
                                            </div>

                                            {ord.status === "cancelled" && (
                                                <Alert variant="danger" className="py-2 small mb-2">
                                                    <strong>Lý do hủy:</strong>{" "}
                                                    {ord.cancelReason || "Không có lý do cụ thể."}
                                                </Alert>
                                            )}

                                            <Table
                                                responsive
                                                size="sm"
                                                className="small align-middle mb-3"
                                            >
                                                <tbody>
                                                    {ord.items.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td>
                                                                <span className="fw-semibold">
                                                                    {toVietnamese(item.name)}
                                                                </span>
                                                                {item.selectedOption && (
                                                                    <Badge
                                                                        bg={
                                                                            item.selectedOption ===
                                                                                "Đặc biệt" ||
                                                                            item.selectedOption.includes(
                                                                                "XL"
                                                                            )
                                                                                ? "danger"
                                                                                : "secondary"
                                                                        }
                                                                        className="ms-2 fw-normal"
                                                                        style={{
                                                                            fontSize: "0.7rem"
                                                                        }}
                                                                    >
                                                                        {item.selectedOption}
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                            <td className="text-center">
                                                                x{item.quantity}
                                                            </td>
                                                            <td className="text-end fw-semibold">
                                                                {(
                                                                    item.price * item.quantity
                                                                ).toLocaleString("vi-VN")}{" "}
                                                                đ
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>

                                            <div className="mt-auto pt-2 border-top">
                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <span className="fw-bold">Tổng đơn này:</span>
                                                    <span className="fw-bold text-danger fs-5">
                                                        {ord.totalAmount.toLocaleString("vi-VN")} đ
                                                    </span>
                                                </div>

                                                <div className="d-flex gap-2">
                                                    {ord.status === "pending" && (
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            className="fw-bold flex-grow-1"
                                                            onClick={() => handleCancelOrder(ord)}
                                                            disabled={cancellingId === ord._id}
                                                        >
                                                            {cancellingId === ord._id ? (
                                                                <>
                                                                    <Spinner
                                                                        animation="border"
                                                                        size="sm"
                                                                        className="me-1"
                                                                    />
                                                                    Đang hủy...
                                                                </>
                                                            ) : (
                                                                "Hủy Đơn Hàng"
                                                            )}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        as={Link}
                                                        to={`/track/${ord._id}`}
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        className={
                                                            ord.status === "pending"
                                                                ? ""
                                                                : "w-100"
                                                        }
                                                    >
                                                        Chi Tiết Đơn
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                </>
            )}
        </div>
    );
};

export default OrderedItemsTab;
