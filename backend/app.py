# file: backend/app.py
# description: Flask Anwendung mit sicheren REST Endpunkten und Websocket Support
# fuer Workflow Start, Live Status und Tool Registry aus JSON.
# history:
# - 2026-03-25: Erstellt fuer Lowcode Backend. author Marcus Schlieper
# - 2026-04-04: Workflow Run Endpunkt fuer Frontend Start und verbesserte Fehlerantworten erweitert. author Marcus Schlieper
# - 2026-04-11: Tools Endpunkt fuer Frontend Tool Registry aus JSON Datei ergaenzt. author Marcus Schlieper
# - 2026-04-23: SocketIO Start in Main Guard verschoben, damit Websocket Events stabil registriert bleiben. author Marcus Schlieper
# author Marcus Schlieper
# venv aktivieren: .\.venv\Scripts\Activate.ps1
#
# Syntax:
# {{input:input_main.results}}
# {{output:output_main.result}}
# {{node:http_1.output.output_main.body}}
# {{node:llm_1.result.output.answer}}
# {{global:customer_name}}
# {{workflow:name}}

from functools import wraps
from pathlib import Path
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from config import Config
from services.validation_service import ValidationService
from services.websocket_manager import WebsocketManager
from services.workflow_runner import WorkflowRunner

app = Flask(__name__)
app.config.from_object(Config)
app.config["MAX_CONTENT_LENGTH"] = app.config["MAX_CONTENT_LENGTH"]

a_origins = [
    s_item.strip()
    for s_item in app.config["ALLOWED_ORIGINS"].split(",")
    if s_item.strip()
]

#a_origins ="*"
# Wichtig:
# CORS nicht nur fuer /api/*, sondern auch fuer Socket.IO aktivieren.
# Socket.IO nutzt zuerst oft polling unter /socket.io/.
CORS(
    app,
    resources={
        r"/api/*": {"origins": a_origins},
        r"/socket.io/*": {"origins": a_origins},
    },
    supports_credentials=False,
)

socketio = SocketIO(
    app,
    cors_allowed_origins=a_origins,
    async_mode=app.config["SOCKET_ASYNC_MODE"],
    # Erlaubt beide ueblichen Transportwege.
    transports=["polling", "websocket"],
)

websocket_manager = WebsocketManager(socketio)
workflow_runner = WorkflowRunner(websocket_manager)


def require_api_token(func):
    # Schuetzt Endpunkte ueber statischen Bearer Token.
    @wraps(func)
    def wrapper(*args, **kwargs):
        s_expected_token = str(app.config.get("API_TOKEN", "")).strip()
        if s_expected_token == "":
            return func(*args, **kwargs)

        s_auth_header = request.headers.get("Authorization", "")
        s_expected = f"Bearer {s_expected_token}"

        if s_auth_header != s_expected:
            return jsonify({"success": False, "error": "unauthorized"}), 401

        return func(*args, **kwargs)

    return wrapper


def load_tool_schemas_from_json() -> list[dict]:
    # Laedt Tool Schemata sicher aus der JSON Datei.
    # history:
    # - 2026-04-11: Erstellt fuer Laden der Tool Registry aus tools_schemas.json. author Marcus Schlieper

    o_file_path = Path(__file__).resolve().parent / "tools_schemas.json"

    if not o_file_path.exists():
        return []

    try:
        with o_file_path.open("r", encoding="utf-8") as o_file:
            o_payload = json.load(o_file)
    except (OSError, json.JSONDecodeError):
        return []

    if isinstance(o_payload, list):
        a_tools = o_payload
    elif isinstance(o_payload, dict) and isinstance(o_payload.get("a_tools"), list):
        a_tools = o_payload.get("a_tools", [])
    else:
        return []

    a_safe_tools = []
    for o_item in a_tools:
        if isinstance(o_item, dict) and isinstance(o_item.get("s_type"), str):
            a_safe_tools.append(o_item)

    return a_safe_tools


@app.get("/api/health")
def health() -> tuple:
    # Healthcheck Endpunkt.
    return jsonify({"success": True, "status": "ok"}), 200


@app.get("/api/tools")
@require_api_token
def get_tools() -> tuple:
    # Liefert die Tool Registry fuer das Frontend aus JSON Datei.
    a_tools = load_tool_schemas_from_json()
    return jsonify({"success": True, "a_tools": a_tools}), 200


@app.post("/api/workflows/validate")
@require_api_token
def validate_workflow() -> tuple:
    # Validiert Workflow Daten.
    payload = request.get_json(silent=True)
    b_valid, a_errors = ValidationService.validate_workflow_payload(payload or {})
    return jsonify({"success": b_valid, "errors": a_errors}), 200


@app.post("/api/workflows/run")
@require_api_token
def run_workflow() -> tuple:
    # Fuehrt einen Workflow aus und sendet Live Updates ueber Websocket.
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({"success": False, "error": "invalid_json_payload"}), 400

    if "name" not in payload and "s_name" in payload:
        payload["name"] = payload.get("s_name")

    b_valid, a_errors = ValidationService.validate_workflow_payload(payload or {})
    if not b_valid:
        return jsonify({"success": False, "errors": a_errors}), 400

    try:
        o_result = workflow_runner.run_workflow(payload)
    except Exception as o_exc:
        return jsonify(
            {
                "success": False,
                "error": "workflow_execution_failed",
                "detail": str(o_exc),
            }
        ), 500

    i_status = 200 if o_result.get("success") else 500
    return jsonify(o_result), i_status

@app.get("/api/debug/cors")
def debug_cors() -> tuple:
    # Liefert die aktiven erlaubten Origins fuer lokale Fehlersuche.
    return jsonify(
        {
            "success": True,
            "allowed_origins": a_origins,
        }
    ), 200

@socketio.on("connect", namespace="/ws")
def handle_connect():
    # Verbindungsbestaetigung fuer Clients im Namespace ws.
    websocket_manager.emit_status("system_status", {"status": "connected"})


@socketio.on("disconnect", namespace="/ws")
def handle_disconnect():
    # Einfacher Disconnect Handler.
    pass


if __name__ == "__main__":
    # Start nur im Main Guard, damit Imports keine zweite App Instanz starten.
    socketio.run(app, host="0.0.0.0", port=8000, debug=False)
