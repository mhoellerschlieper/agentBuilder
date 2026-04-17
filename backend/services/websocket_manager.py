# file: backend/services/websocket_manager.py
# description: Versand von Live Status Meldungen ueber SocketIO.
# history:
# - 2026-03-25: Erstellt fuer Live Ausfuehrungsdaten. author Marcus Schlieper

from flask_socketio import SocketIO


class WebsocketManager:
    # Kapselt Socket Events fuer den Workflow Runner.

    def __init__(self, socketio: SocketIO) -> None:
        self.socketio = socketio

    def emit_status(self, s_event: str, payload: dict) -> None:
        # Sendet ein Event an alle verbundenen Clients.
        self.socketio.emit(s_event, payload, namespace="/ws")
