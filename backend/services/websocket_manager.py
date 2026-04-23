# file: backend/services/websocket_manager.py
# description: Versand von Live Status Meldungen ueber SocketIO.
# history:
# - 2026-03-25: Erstellt fuer Live Ausfuehrungsdaten. author Marcus Schlieper
# - 2026-04-23: Thread sichere Auslieferung von Socket Events fuer Live Node Status ergaenzt. author Marcus Schlieper
# author Marcus Schlieper

from flask_socketio import SocketIO


class WebsocketManager:
    # Kapselt Socket Events fuer den Workflow Runner.

    def __init__(self, socketio: SocketIO) -> None:
        self.socketio = socketio

    def emit_status(self, s_event: str, payload: dict) -> None:
        # Sendet ein Event an alle verbundenen Clients.
        # Die Nutzung von start_background_task vermeidet Probleme,
        # wenn Events aus Worker Threads gesendet werden.
        self.socketio.start_background_task(
            self._emit_status_safe,
            s_event,
            payload,
        )

    def _emit_status_safe(self, s_event: str, payload: dict) -> None:
        # Fuehrt das eigentliche Emit in einem sicheren Kontext aus.
        # history:
        # - 2026-04-23: Aus emit_status ausgelagert fuer thread sichere Websocket Sends. author Marcus Schlieper
        if not isinstance(s_event, str):
            return
        if not isinstance(payload, dict):
            return
        self.socketio.emit(s_event, payload, namespace="/ws")
