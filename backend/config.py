# file: backend/config.py
# description: Zentrale Konfiguration fuer das Flask Backend.
# history:
# - 2026-03-25: Erstellt fuer Lowcode System. author Marcus Schlieper

import os


class Config:
    # Basis Konfiguration mit sicheren Defaults.
    SECRET_KEY = os.getenv("SECRET_KEY", "change_me_in_production")
    JSON_SORT_KEYS = False

    # CORS Whitelist als CSV aus Umgebungsvariable.
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")

    # Websocket Einstellungen.
    SOCKET_ASYNC_MODE = os.getenv("SOCKET_ASYNC_MODE", "threading")

    # Begrenzung fuer Request Groesse in Bytes.
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", "1048576"))

    # Einfache API Absicherung ueber Token.
    API_TOKEN = os.getenv("API_TOKEN", "change_this_token")
    
    
    OPENAI_API_KEY=os.getenv('OPENAI_API_KEY')
    OPENAI_API_KEY_ORG=os.getenv('OPENAI_API_KEY_ORG')
    OPENAI_API_KEY_PRO=os.getenv('OPENAI_API_KEY_PRO')
    
    
    MODEL_NAME = "gpt-5.4" #"o3" #"gpt-5"       #"o3" #"gpt-5"       #"gpt-4.5-preview" #"gpt-4.5-preview" #"gpt-4.1"     #"o3-pro-2025-06-10"#"gpt-4o"  #"gpt-4.5-preview"#"gpt-4o"  # "gpt-4-turbo"#"gpt-4"
    MODEL_MINI = "o3-mini"#"gpt-4o-mini" #"o3-mini"#"gpt-4o-mini"
    MODEL_NAME_OMNI = "o1-2024-12-17"

    MODEL_MINI_FAST = "gpt-4.1-nano"#"o3-mini"

    MODEL_IMAGE = "gpt-image-1"#  IMAGE TO TEXT   "gpt-4o"#"dall-e-3"#"gpt-image-1"#"gpt-4o"
    MODEL_IMAGE_TO_TEXT = "gpt-4.1-mini" #gpt-4o"

    MODEL_IMAGING_TEXT = "gpt-5" 
    MODEL_IMAGING_PLANNING = "gpt-5-mini" #"gpt-4.1-mini" #gpt-4o"

    smallModel2 = MODEL_MINI#"gpt-4o-mini"
    smallmodel = "gpt-3.5-turbo"
    model_name = "gpt-3.5-turbo-instruct"

    MODEL_OMNI= "o1-2024-12-17"
    MODEL_OMNI_MINI= "o1-mini-2024-09-12"


    max_OutputTokens = 8192*2
    chunk_size_limit = 10024
    max_chunk_overlap = 0.1  # 20
