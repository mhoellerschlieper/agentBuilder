# file: backend/llm.py
# description: Zentrale Konfiguration fuer LLM Aufrufe mit Auswahl zwischen
# OpenAI Standard Client und frei konfigurierbarem Endpoint fuer llmTextGen.
# history:
# - 2026-03-25: Erstellt fuer Lowcode System. author Marcus Schlieper
# - 2026-04-08: Erweitert um Provider Auswahl zwischen openai und endpoint,
#   Modellauswahl fuer llmTextGen, sichere Validierung, Timeout Grenzen und
#   Endpoint Aufrufe mit OpenAI kompatiblem Chat Completions Format.
#   author Marcus Schlieper
# author Marcus Schlieper

import os
import json
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import requests
from openai import OpenAI as _OpenAI


def getOpenAIClient():
    # Erstellt den Standard OpenAI Client aus Umgebungsvariablen.
    s_key = os.getenv("OPENAI_API_KEY")
    s_organization = os.getenv("OPENAI_API_KEY_ORG")
    s_project = os.getenv("OPENAI_API_KEY_PRO")

    return _OpenAI(
        api_key=s_key,
        organization=s_organization,
        project=s_project,
    )


def get_openai_model_choices() -> List[str]:
    # Statische sichere Vorauswahl fuer haeufige OpenAI Modelle.
    # Kann spaeter zentral erweitert werden.
    return [
        "gpt-4.1",
        "gpt-4.1-mini",
        "gpt-4.1-nano",
        "gpt-4o",
        "gpt-4o-mini",
        "o4-mini",
        "o3",
        "o3-mini",
    ]


def _sanitize_messages(a_messages: Any) -> List[Dict[str, str]]:
    # Normalisiert Nachrichten in ein sicheres Chat Format.
    if not isinstance(a_messages, list):
        raise ValueError("messages_invalid")

    a_result: List[Dict[str, str]] = []
    a_allowed_roles = {"system", "user", "assistant", "developer", "tool"}

    for o_item in a_messages:
        if not isinstance(o_item, dict):
            continue

        s_role = str(o_item.get("role", "")).strip().lower()
        s_content = str(o_item.get("content", "")).strip()

        if s_role == "" or s_role not in a_allowed_roles:
            continue

        a_result.append(
            {
                "role": s_role,
                "content": s_content,
            }
        )

    if len(a_result) == 0:
        raise ValueError("messages_empty")

    return a_result


def _sanitize_model_name(s_model: Any) -> str:
    # Laesst nur ein einfaches sicheres Modellformat zu.
    s_value = str(s_model or "").strip()
    if s_value == "":
        raise ValueError("model_required")
    if len(s_value) > 100:
        raise ValueError("model_invalid")
    for s_char in s_value:
        if not (s_char.isalnum() or s_char in ["-", "_", ".", ":"]):
            raise ValueError("model_invalid")
    return s_value


def _sanitize_timeout_ms(i_timeout: Any) -> float:
    # Wandelt Millisekunden in Sekunden um und begrenzt den Bereich.
    try:
        i_value = int(i_timeout)
    except Exception as o_exc:
        raise ValueError("timeout_invalid") from o_exc

    if i_value < 1000 or i_value > 300000:
        raise ValueError("timeout_out_of_range")

    return i_value / 1000.0


def _sanitize_max_completion_tokens(i_value: Any) -> int:
    # Begrenzt die maximalen Completion Tokens.
    try:
        i_tokens = int(i_value)
    except Exception as o_exc:
        raise ValueError("max_completion_tokens_invalid") from o_exc

    if i_tokens < 1 or i_tokens > 16000:
        raise ValueError("max_completion_tokens_out_of_range")

    return i_tokens


def _sanitize_response_format(o_response_format: Any) -> Dict[str, Any]:
    # Akzeptiert nur bekannte sichere response_format Werte.
    if not isinstance(o_response_format, dict):
        return {"type": "text"}

    s_type = str(o_response_format.get("type", "text")).strip().lower()
    if s_type not in ["text", "json_object", "json_schema"]:
        return {"type": "text"}

    if s_type == "json_schema":
        o_json_schema = o_response_format.get("json_schema")
        if not isinstance(o_json_schema, dict):
            return {"type": "text"}
        return {
            "type": "json_schema",
            "json_schema": o_json_schema,
        }

    return {"type": s_type}


def _sanitize_provider(s_provider: Any) -> str:
    # Provider Auswahl fuer llmTextGen.
    s_value = str(s_provider or "openai").strip().lower()
    if s_value not in ["openai", "endpoint"]:
        raise ValueError("provider_invalid")
    return s_value


def _sanitize_endpoint_url(s_url: Any) -> str:
    # Prueft Basis URL fuer externe OpenAI kompatible Endpoints.
    s_value = str(s_url or "").strip()
    if s_value == "":
        raise ValueError("endpoint_url_required")

    o_parsed = urlparse(s_value)
    if o_parsed.scheme not in ["http", "https"]:
        raise ValueError("endpoint_url_invalid_scheme")
    if str(o_parsed.netloc).strip() == "":
        raise ValueError("endpoint_url_invalid_host")

    return s_value.rstrip("/")


def _sanitize_endpoint_headers(o_headers: Any) -> Dict[str, str]:
    # Optional zusaetzliche Header fuer Endpoint Requests.
    if o_headers is None:
        return {}

    if not isinstance(o_headers, dict):
        raise ValueError("endpoint_headers_invalid")

    d_result: Dict[str, str] = {}
    for s_key, o_value in o_headers.items():
        s_safe_key = str(s_key).strip()
        s_safe_value = str(o_value).strip()

        if s_safe_key == "":
            continue
        if len(s_safe_key) > 100 or len(s_safe_value) > 5000:
            raise ValueError("endpoint_headers_invalid")
        if "\r" in s_safe_key or "\n" in s_safe_key:
            raise ValueError("endpoint_headers_invalid")
        if "\r" in s_safe_value or "\n" in s_safe_value:
            raise ValueError("endpoint_headers_invalid")

        d_result[s_safe_key] = s_safe_value

    return d_result


def _build_endpoint_chat_url(s_endpoint_url: str) -> str:
    # Erzeugt einen OpenAI kompatiblen Chat Completions Pfad.
    if s_endpoint_url.endswith("/chat/completions"):
        return s_endpoint_url
    if s_endpoint_url.endswith("/v1"):
        return s_endpoint_url + "/chat/completions"
    return s_endpoint_url + "/v1/chat/completions"


def _extract_usage_dict(o_usage: Any) -> Dict[str, int]:
    # Vereinheitlicht Usage Daten aus OpenAI oder Endpoint Antwort.
    d_token = {
        "completation_token": 0,
        "prompt_token": 0,
        "total_token": 0,
    }

    if not o_usage:
        return d_token

    try:
        d_token["completation_token"] = int(
            o_usage.get("completion_tokens", 0) or 0
        )
        d_token["prompt_token"] = int(o_usage.get("prompt_tokens", 0) or 0)
        d_token["total_token"] = int(o_usage.get("total_tokens", 0) or 0)
    except Exception:
        return d_token

    return d_token


def _call_openai_chat_completion(
    s_model: str,
    a_messages: List[Dict[str, str]],
    i_max_completion_tokens: int,
    d_timeout_seconds: float,
    o_response_format: Dict[str, Any],
) -> Tuple[str, Dict[str, int]]:
    # Fuehrt den Standard OpenAI Aufruf aus.
    d_token = {
        "completation_token": 0,
        "prompt_token": 0,
        "total_token": 0,
    }

    o_client = getOpenAIClient()
    try:
        o_completion = o_client.chat.completions.create(
            model=s_model,
            messages=a_messages,
            max_completion_tokens=i_max_completion_tokens,
            timeout=d_timeout_seconds,
            response_format=o_response_format,
        )

        s_response = str(
            o_completion.choices[0].message.content
            if o_completion.choices and o_completion.choices[0].message.content is not None
            else ""
        )

        d_token["completation_token"] = int(
            o_completion.usage.completion_tokens if o_completion.usage else 0
        )
        d_token["prompt_token"] = int(
            o_completion.usage.prompt_tokens if o_completion.usage else 0
        )
        d_token["total_token"] = int(
            o_completion.usage.total_tokens if o_completion.usage else 0
        )

        return s_response, d_token
    finally:
        try:
            o_client.close()
        except Exception:
            pass


def _call_endpoint_chat_completion(
    s_endpoint_url: str,
    s_model: str,
    a_messages: List[Dict[str, str]],
    i_max_completion_tokens: int,
    d_timeout_seconds: float,
    o_response_format: Dict[str, Any],
    s_api_key: str = "",
    d_headers: Optional[Dict[str, str]] = None,
) -> Tuple[str, Dict[str, int]]:
    # Fuehrt einen OpenAI kompatiblen Endpoint Request aus.
    s_chat_url = _build_endpoint_chat_url(s_endpoint_url)

    d_request_headers: Dict[str, str] = {
        "Content-Type": "application/json",
    }

    if s_api_key.strip() != "":
        d_request_headers["Authorization"] = "Bearer " + s_api_key.strip()

    if isinstance(d_headers, dict):
        for s_key, s_value in d_headers.items():
            d_request_headers[s_key] = s_value

    d_payload: Dict[str, Any] = {
        "model": s_model,
        "messages": a_messages,
        "max_completion_tokens": i_max_completion_tokens,
        "response_format": o_response_format,
    }

    o_response = requests.post(
        s_chat_url,
        headers=d_request_headers,
        json=d_payload,
        timeout=d_timeout_seconds,
        allow_redirects=False,
    )
    o_response.raise_for_status()

    o_json = o_response.json()
    a_choices = o_json.get("choices", [])
    if not isinstance(a_choices, list) or len(a_choices) == 0:
        raise ValueError("endpoint_response_choices_missing")

    o_first_choice = a_choices[0]
    if not isinstance(o_first_choice, dict):
        raise ValueError("endpoint_response_choice_invalid")

    o_message = o_first_choice.get("message", {})
    if not isinstance(o_message, dict):
        raise ValueError("endpoint_response_message_invalid")

    s_response = str(o_message.get("content", "") or "")
    d_token = _extract_usage_dict(o_json.get("usage", {}))

    return s_response, d_token


def llmTextGen(
    model,
    messages,
    max_completion_tokens=16000,
    timeout=20000,
    response_format={"type": "text"},
    s_provider="openai",
    s_endpoint_url="",
    s_endpoint_api_key="",
    d_endpoint_headers=None,
):
    # history:
    # - 2026-04-08: Provider Auswahl zwischen openai und endpoint ergaenzt.
    #   author Marcus Schlieper
    response = ""
    token = {}
    token["completation_token"] = 0
    token["prompt_token"] = 0
    token["total_token"] = 0

    try:
        s_provider_safe = _sanitize_provider(s_provider)
        s_model_safe = _sanitize_model_name(model)
        a_messages_safe = _sanitize_messages(messages)
        i_max_completion_tokens_safe = _sanitize_max_completion_tokens(
            max_completion_tokens
        )
        d_timeout_seconds = _sanitize_timeout_ms(timeout)
        o_response_format_safe = _sanitize_response_format(response_format)

        if s_provider_safe == "openai":
            response, token = _call_openai_chat_completion(
                s_model=s_model_safe,
                a_messages=a_messages_safe,
                i_max_completion_tokens=i_max_completion_tokens_safe,
                d_timeout_seconds=d_timeout_seconds,
                o_response_format=o_response_format_safe,
            )
        else:
            s_endpoint_url_safe = _sanitize_endpoint_url(s_endpoint_url)
            d_endpoint_headers_safe = _sanitize_endpoint_headers(d_endpoint_headers)

            response, token = _call_endpoint_chat_completion(
                s_endpoint_url=s_endpoint_url_safe,
                s_model=s_model_safe,
                a_messages=a_messages_safe,
                i_max_completion_tokens=i_max_completion_tokens_safe,
                d_timeout_seconds=d_timeout_seconds,
                o_response_format=o_response_format_safe,
                s_api_key=str(s_endpoint_api_key or "").strip(),
                d_headers=d_endpoint_headers_safe,
            )

    except Exception as error:
        response = "error in chatbot:" + str(error)

    return response, token
