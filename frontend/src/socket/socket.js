import { io } from "socket.io-client";

// Ket noi cung host va port thong qua Vite proxy
export const socket = io("/", {
    autoConnect: true,
    transports: ["websocket", "polling"]
});

