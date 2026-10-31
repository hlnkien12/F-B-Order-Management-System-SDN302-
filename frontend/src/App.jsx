import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import AppNavbar from "./components/AppNavbar";
import AdminLayout from "./components/AdminLayout";

// Pages Khach hang
import MenuPage from "./pages/customer/MenuPage";
import CartPage from "./pages/customer/CartPage";
import OrderTrackingPage from "./pages/customer/OrderTrackingPage";
import MyOrdersPage from "./pages/customer/MyOrdersPage";

// Pages Auth
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

// Pages Quan tri va Nhan vien (P6)
import OrdersBoardPage from "./pages/admin/OrdersBoardPage";
import MenuManagePage from "./pages/admin/MenuManagePage";
import TablesPage from "./pages/admin/TablesPage";
import StaffManagePage from "./pages/admin/StaffManagePage";

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <CartProvider>
                    <div className="min-vh-100 d-flex flex-column bg-light">
                        <AppNavbar />
                        <main className="flex-grow-1">
                            <Routes>
                                {/* Luong khach hang goi mon */}
                                <Route path="/" element={<MenuPage />} />
                                <Route path="/cart" element={<CartPage />} />
                                <Route path="/track/:orderId" element={<OrderTrackingPage />} />
                                <Route path="/my-orders" element={<MyOrdersPage />} />

                                {/* Luong dang nhap dang ky */}
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />

                                {/* Khu vuc Quan Tri & Nhan Vien (P6) */}
                                <Route path="/admin" element={<AdminLayout />}>
                                    <Route index element={<Navigate to="/admin/orders" replace />} />
                                    <Route path="orders" element={<OrdersBoardPage />} />
                                    <Route path="menu" element={<MenuManagePage />} />
                                    <Route path="tables" element={<TablesPage />} />
                                    <Route path="staff" element={<StaffManagePage />} />
                                </Route>
                            </Routes>
                        </main>
                    </div>
                </CartProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
