/* file: frontend/src/services/socket.ts
description: Socket Verbindung fuer Live Status Updates zum Backend.
history:
- 2026-04-23: Backend Port auf 8001 fuer lokale Verbindung angepasst. author Marcus Schlieper
author Marcus Schlieper */

import { io, Socket } from "socket.io-client";

let o_socket: Socket | null = null;

export function get_socket(): Socket {
  if (o_socket) {
    return o_socket;
  }

  // Wichtig:
  // Frontend und Backend muessen denselben Host klar nutzen.
  // Kein Mix aus localhost und 127.0.0.1.
  const s_backend_url = "http://127.0.0.1:8000/ws";

  o_socket = io(s_backend_url, { 
    path: "/socket.io",
    transports: ["polling", "websocket"],
    withCredentials: false,
    
  });


  return o_socket;
}
