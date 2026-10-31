import axios from "axios";

// 1. Khoi tao instance axios
const axiosClient = axios.create({
    baseURL: "/api",
    withCredentials: true, // Gui kem Cookie refreshToken
    headers: {
        "Content-Type": "application/json"
    }
});

// Bien luu Access Token trong bo nho RAM
let currentAccessToken = null;

export const setAccessToken = (token) => {
    currentAccessToken = token;
};

export const getAccessToken = () => currentAccessToken;

// 2. Interceptor truoc khi gui request: Gan Bearer token neu co
axiosClient.interceptors.request.use(
    (config) => {
        if (currentAccessToken) {
            config.headers.Authorization = `Bearer ${currentAccessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. Interceptor khi nhan response: Tu dong refresh token khi bi 401
axiosClient.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const originalRequest = error.config;

        // Neu loi 401 va chua tung thu refresh
        if (
            error.response &&
            error.response.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes("/auth/login") &&
            !originalRequest.url.includes("/auth/refresh")
        ) {
            originalRequest._retry = true;
            try {
                const res = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
                const newToken = res.data?.data?.accessToken;
                if (newToken) {
                    setAccessToken(newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return axios(originalRequest).then((r) => r.data);
                }
            } catch (refreshErr) {
                setAccessToken(null);
                return Promise.reject(refreshErr);
            }
        }

        return Promise.reject(error.response?.data?.error || error.message);
    }
);

export default axiosClient;

