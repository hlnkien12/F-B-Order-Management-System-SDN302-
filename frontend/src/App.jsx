import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import AppNavbar from "./components/AppNavbar";

// Pages Khach hang
import MenuPage from "./pages/customer/MenuPage";
import CartPage from "./pages/customer/CartPage";
import OrderTrackingPage from "./pages/customer/OrderTrackingPage";
import MyOrdersPage from "./pages/customer/MyOrdersPage";

// Pages Auth
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

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

                                {/* Route tam cho Admin se duoc lap day o Giai doan P6 */}
                                <Route
                                    path="/admin/*"
                                    element={
                                        <div className="container py-5 text-center">
                                            <h4>Khu Vuc Quan Tri va Bep</h4>
                                            <p className="text-muted">
                                                Giai doan P6 se lap day cac trang quan ly don realtime va menu tai day.
                                            </p>
                                        </div>
                                    }
                                />
                            </Routes>
                        </main>
                    </div>
                </CartProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
