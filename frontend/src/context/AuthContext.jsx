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

    // 1. Khi load trang, thu goi refresh de lay session dang nhap cu neu con cookie
    useEffect(() => {
        const checkAuth = async () => {
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

