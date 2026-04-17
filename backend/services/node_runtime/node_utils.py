# file: backend/services/node_runtime/node_utils.py
# description: Gemeinsame Hilfsfunktionen fuer Node Implementierungen.
# history:
# - 2026-04-14: Erste Version mit Platzhalter Aufloesung und Validierung. author Marcus Schlieper

import copy
import ipaddress
import json
import re
from typing import Any, Dict, List
from urllib.parse import urlparse


def sanitize_handle_key(s_value: str) -> str:
    s_value = str(s_value).strip().lower()
    s_value = re.sub(r"[^a-z0-9_]+", "_", s_value)
    s_value = re.sub(r"_+", "_", s_value)
    s_value = s_value.strip("_")
    return s_value


def try_parse_json_string(s_value: str) -> Any:
    try:
        return json.loads(s_value)
    except Exception:
        return None


def get_nested_value(o_data: Any, s_path: str) -> Any:
    if not isinstance(s_path, str) or s_path.strip() == "":
        return None

    a_parts = [s_part for s_part in s_path.split(".") if s_part.strip() != ""]
    o_current: Any = o_data

    for s_part in a_parts:
        if isinstance(o_current, dict):
            if s_part not in o_current:
                return None
            o_current = o_current[s_part]
            continue

        if isinstance(o_current, list):
            if not s_part.isdigit():
                return None
            i_index = int(s_part)
            if i_index < 0 or i_index >= len(o_current):
                return None
            o_current = o_current[i_index]
            continue

        return None

    return o_current


def get_from_inputs_path(a_inputs: List[Any], a_parts: List[str]) -> Any:
    o_current: Any = a_inputs

    for s_part in a_parts:
        if isinstance(o_current, list):
            if not s_part.isdigit():
                return None
            i_index = int(s_part)
            if i_index < 0 or i_index >= len(o_current):
                return None
            o_current = o_current[i_index]
            continue

        if isinstance(o_current, dict):
            if s_part not in o_current:
                return None
            o_current = o_current[s_part]
            continue

        return None

    return o_current


def resolve_input_reference(o_input_context: Dict[str, Any], s_path: str) -> Any:
    s_path = str(s_path).strip()
    if s_path == "":
        return None

    a_parts = [s_part for s_part in s_path.split(".") if s_part.strip() != ""]
    if not a_parts:
        return None

    if a_parts[0].isdigit():
        return get_from_inputs_path(o_input_context.get("inputs", []), a_parts)

    if a_parts[0] in ["inputs", "input", "named_inputs"]:
        return get_nested_value(o_input_context, s_path)

    d_named_inputs = o_input_context.get("named_inputs", {})
    if isinstance(d_named_inputs, dict) and a_parts[0] in d_named_inputs:
        o_current = d_named_inputs.get(a_parts[0])
        for s_part in a_parts[1:]:
            if isinstance(o_current, dict):
                if s_part not in o_current:
                    return None
                o_current = o_current[s_part]
                continue

            if isinstance(o_current, list):
                if not s_part.isdigit():
                    return None
                i_index = int(s_part)
                if i_index < 0 or i_index >= len(o_current):
                    return None
                o_current = o_current[i_index]
                continue

            return None
        return o_current

    return get_nested_value(o_input_context, s_path)


def replace_input_placeholders(o_value: Any, o_input_context: Dict[str, Any]) -> Any:
    if isinstance(o_value, dict):
        return {
            s_key: replace_input_placeholders(o_sub_value, o_input_context)
            for s_key, o_sub_value in o_value.items()
        }

    if isinstance(o_value, list):
        return [
            replace_input_placeholders(o_sub_value, o_input_context)
            for o_sub_value in o_value
        ]

    if not isinstance(o_value, str):
        return o_value

    o_full_match = re.fullmatch(r"\{\{input:([a-zA-Z0-9_\.\-]+)\}\}", o_value)
    if o_full_match:
        s_path = str(o_full_match.group(1))
        return resolve_input_reference(o_input_context, s_path)

    def _replace_match(o_match: re.Match) -> str:
        s_path = str(o_match.group(1))
        o_resolved = resolve_input_reference(o_input_context, s_path)
        if o_resolved is None:
            return ""
        return str(o_resolved)

    return re.sub(r"\{\{input:([a-zA-Z0-9_\.\-]+)\}\}", _replace_match, o_value)


def extract_primary_named_input(o_input_context: Dict[str, Any]) -> Any:
    d_named_inputs = o_input_context.get("named_inputs", {})
    if isinstance(d_named_inputs, dict):
        if "input_main" in d_named_inputs:
            return copy.deepcopy(d_named_inputs.get("input_main"))
        for s_key in d_named_inputs:
            return copy.deepcopy(d_named_inputs.get(s_key))

    a_inputs = o_input_context.get("inputs", [])
    if isinstance(a_inputs, list) and len(a_inputs) > 0:
        return copy.deepcopy(a_inputs[0])

    return {"value": None}


def validate_safe_outbound_url(s_url: str) -> None:
    o_parsed = urlparse(s_url)

    if o_parsed.scheme not in ["http", "https"]:
        raise ValueError("invalid_http_url_scheme")

    s_hostname = str(o_parsed.hostname or "").strip()
    if s_hostname == "":
        raise ValueError("invalid_http_url_host")

    s_hostname_lower = s_hostname.lower()
    if s_hostname_lower in ["localhost"]:
        raise ValueError("http_private_host_blocked")

    try:
        o_ip = ipaddress.ip_address(s_hostname_lower)
        if (
            o_ip.is_private
            or o_ip.is_loopback
            or o_ip.is_link_local
            or o_ip.is_multicast
            or o_ip.is_reserved
            or o_ip.is_unspecified
        ):
            raise ValueError("http_private_host_blocked")
    except ValueError:
        if s_hostname_lower.endswith(".local"):
            raise ValueError("http_private_host_blocked")

    i_port = o_parsed.port
    if i_port is not None and (i_port < 1 or i_port > 65535):
        raise ValueError("invalid_http_url_port")
