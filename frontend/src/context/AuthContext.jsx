import { createContext, useContext, useState, useEffect } from "react";
import axiosClient, { setAccessToken } from "../api/axiosClient";
import { socket } from "../socket/socket";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const syncSocketToken = (token) => {
        socket.auth = token ? { token } : {};
        if (socket.connected) {
            socket.disconnect().connect();
        }
    };

    // 1. Khi load trang, chi goi refresh neu truoc do da tung dang nhap
    useEffect(() => {
        const checkAuth = async () => {
            const hasSession = localStorage.getItem("has_auth_session") === "1";
            if (!hasSession) {
                setLoading(false);
                return;
            }
            try {
                const res = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
                const token = res.data?.data?.accessToken;
                if (token) {
                    setAccessToken(token);
                    syncSocketToken(token);
                    const meRes = await axiosClient.get("/auth/me");
                    setUser(meRes.data);
                }
            } catch (err) {
                localStorage.removeItem("has_auth_session");
                setUser(null);
                setAccessToken(null);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    // 2. Ham dang nhap
    const login = async (email, password) => {
        const res = await axiosClient.post("/auth/login", { email, password });
        const { user: userData, accessToken } = res.data;
        localStorage.setItem("has_auth_session", "1");
        setAccessToken(accessToken);
        syncSocketToken(accessToken);
        setUser(userData);
        return userData;
    };

    // 3. Ham dang ky khach hang
    const register = async (formData) => {
        return await axiosClient.post("/auth/register", formData);
    };

    // 4. Ham dang xuat
    const logout = async () => {
        try {
            await axiosClient.post("/auth/logout");
        } finally {
            localStorage.removeItem("has_auth_session");
            setUser(null);
            setAccessToken(null);
            syncSocketToken(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
