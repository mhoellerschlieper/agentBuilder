# file: backend/config.py
# description: Zentrale Konfiguration fuer das Flask Backend.
# history:
# - 2026-03-25: Erstellt fuer Lowcode System. author Marcus Schlieper
# - 2026-04-23: Sichere Defaults fuer Produktivbetrieb und Umgebungsvalidierung ergaenzt. author Marcus Schlieper
# author Marcus Schlieper

import os


def _get_required_env_string(s_key: str, s_default: str = "") -> str:
    # Liest eine Umgebungsvariable sicher ein und entfernt Leerzeichen.
    s_value = str(os.getenv(s_key, s_default)).strip()
    return s_value


def _get_env_int(s_key: str, i_default: int, i_min_value: int, i_max_value: int) -> int:
    # Liest Integer Werte sicher ein und begrenzt den Bereich.
    s_raw_value = str(os.getenv(s_key, str(i_default))).strip()
    try:
        i_value = int(s_raw_value)
    except ValueError:
        i_value = i_default

    if i_value < i_min_value:
        return i_min_value
    if i_value > i_max_value:
        return i_max_value
    return i_value


def _get_env_float(s_key: str, d_default: float, d_min_value: float, d_max_value: float) -> float:
    # Liest Float Werte sicher ein und begrenzt den Bereich.
    s_raw_value = str(os.getenv(s_key, str(d_default))).strip()
    try:
        d_value = float(s_raw_value)
    except ValueError:
        d_value = d_default

    if d_value < d_min_value:
        return d_min_value
    if d_value > d_max_value:
        return d_max_value
    return d_value


class Config:
    # Basis Konfiguration mit sicheren Defaults.
    # Hinweis:
    # - Unsichere Platzhalter werden vermieden.
    # - Geheimnisse sollen in der Umgebung gesetzt werden.
    SECRET_KEY = _get_required_env_string("SECRET_KEY", "")
    JSON_SORT_KEYS = False

    # CORS Whitelist als CSV aus Umgebungsvariable.
    ALLOWED_ORIGINS = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:8000,http://localhost:8000",
    )

    # Websocket Einstellungen.
    SOCKET_ASYNC_MODE = _get_required_env_string("SOCKET_ASYNC_MODE", "threading")

    # Begrenzung fuer Request Groesse in Bytes.
    MAX_CONTENT_LENGTH = _get_env_int(
        s_key="MAX_CONTENT_LENGTH",
        i_default=1048576,
        i_min_value=1024,
        i_max_value=104857600,
    )

    # Einfache API Absicherung ueber Token.
    API_TOKEN = _get_required_env_string("API_TOKEN", "")

    # API Schluessel.
    OPENAI_API_KEY = _get_required_env_string("OPENAI_API_KEY")
    OPENAI_API_KEY_ORG = _get_required_env_string("OPENAI_API_KEY_ORG")
    OPENAI_API_KEY_PRO = _get_required_env_string("OPENAI_API_KEY_PRO")

    # Modell Konfiguration.
    MODEL_NAME = _get_required_env_string("MODEL_NAME", "gpt-5.4")
    MODEL_MINI = _get_required_env_string("MODEL_MINI", "o3-mini")
    MODEL_NAME_OMNI = _get_required_env_string("MODEL_NAME_OMNI", "o1-2024-12-17")
    MODEL_MINI_FAST = _get_required_env_string("MODEL_MINI_FAST", "gpt-4.1-nano")
    MODEL_IMAGE = _get_required_env_string("MODEL_IMAGE", "gpt-image-1")
    MODEL_IMAGE_TO_TEXT = _get_required_env_string("MODEL_IMAGE_TO_TEXT", "gpt-4.1-mini")
    MODEL_IMAGING_TEXT = _get_required_env_string("MODEL_IMAGING_TEXT", "gpt-5")
    MODEL_IMAGING_PLANNING = _get_required_env_string("MODEL_IMAGING_PLANNING", "gpt-5-mini")

    # Rueckwaertskompatible Alias Namen.
    smallModel2 = MODEL_MINI
    smallmodel = _get_required_env_string("SMALLMODEL", "gpt-3.5-turbo")
    model_name = _get_required_env_string("MODEL_NAME_LEGACY", "gpt-3.5-turbo-instruct")

    MODEL_OMNI = _get_required_env_string("MODEL_OMNI", "o1-2024-12-17")
    MODEL_OMNI_MINI = _get_required_env_string("MODEL_OMNI_MINI", "o1-mini-2024-09-12")

    # Laufzeit Limits.
    max_OutputTokens = _get_env_int(
        s_key="MAX_OUTPUT_TOKENS",
        i_default=16384,
        i_min_value=256,
        i_max_value=262144,
    )
    chunk_size_limit = _get_env_int(
        s_key="CHUNK_SIZE_LIMIT",
        i_default=10024,
        i_min_value=128,
        i_max_value=1000000,
    )
    max_chunk_overlap = _get_env_float(
        s_key="MAX_CHUNK_OVERLAP",
        d_default=0.1,
        d_min_value=0.0,
        d_max_value=1.0,
    )
