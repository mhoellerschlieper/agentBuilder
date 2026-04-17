// file: frontend/src/services/socket.ts
// description: Websocket Client fuer Live Status Daten.
// history:
// - 2026-03-25: Erstellt fuer Runner Live Updates. author Marcus Schlieper
import { io, Socket } from "socket.io-client";

let o_socket: Socket | null = null;

export function get_socket(): Socket {
  if (!o_socket) {
    o_socket = io("http://localhost:8000", {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
  }
  return o_socket;
}
