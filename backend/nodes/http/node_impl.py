# file: backend/nodes/http/node_impl.py
# description: HTTP Node Implementierung mit sicherer Validierung.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper

import copy
from typing import Any, Dict, List

import requests

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import (
    try_parse_json_string,
    validate_safe_outbound_url,
)


class HttpNode(BaseNode):
    def get_node_type(self) -> str:
        return "http"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "input_main", "s_label": "request", "s_description": "main input"}
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "output_main", "s_label": "response", "s_description": "http response"}
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))

        s_url = str(o_data.get("url", o_data.get("s_api", ""))).strip()
        s_method = str(o_data.get("s_method", "GET")).strip().upper()
        i_timeout_raw = int(o_data.get("i_timeout", 0) or 0)
        s_body = str(o_data.get("s_body", "")).strip()

        if s_url == "":
            raise ValueError("http_url_required")

        validate_safe_outbound_url(s_url)

        if s_method not in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
            raise ValueError("http_method_unsupported")

        i_timeout_ms = i_timeout_raw if i_timeout_raw > 0 else 30000
        if i_timeout_ms < 100 or i_timeout_ms > 300000:
            raise ValueError("http_timeout_out_of_range")

        d_headers = self._extract_http_headers(o_data)
        d_headers = self._sanitize_http_headers(d_headers)

        o_request_kwargs: Dict[str, Any] = {
            "headers": d_headers,
            "timeout": i_timeout_ms / 1000.0,
            "allow_redirects": False,
        }

        if s_method in ["POST", "PUT", "PATCH", "DELETE"] and s_body != "":
            o_body_value = try_parse_json_string(s_body)
            if isinstance(o_body_value, (dict, list)):
                o_request_kwargs["json"] = o_body_value
                if "Content-Type" not in d_headers:
                    o_request_kwargs["headers"] = {
                        **d_headers,
                        "Content-Type": "application/json",
                    }
            else:
                o_request_kwargs["data"] = s_body.encode("utf-8")

        try:
            o_response = requests.request(
                method=s_method,
                url=s_url,
                **o_request_kwargs,
            )
        except requests.Timeout as o_exc:
            raise ValueError("http_request_timeout") from o_exc
        except requests.RequestException as o_exc:
            raise ValueError(f"http_request_failed:{str(o_exc)}") from o_exc

        s_response_text = o_response.text
        if len(s_response_text) > 200000:
            s_response_text = s_response_text[:200000]

        o_response_json = None
        s_content_type = str(o_response.headers.get("Content-Type", "")).lower()
        if "application/json" in s_content_type:
            try:
                o_response_json = o_response.json()
            except Exception:
                o_response_json = None

        o_response_payload = {
            "status_code": int(o_response.status_code),
            "ok": bool(o_response.ok),
            "method": s_method,
            "url": s_url,
            "timeout_ms": i_timeout_ms,
            "request_headers": d_headers,
            "request_body_present": s_body != "",
            "request_body_preview": s_body[:2000] if s_body != "" else "",
            "response_headers": self._sanitize_response_headers(dict(o_response.headers)),
            "response_text": s_response_text,
            "response_json": o_response_json,
            "content_type": s_content_type,
            "resolved_data": o_data,
            "inputs_used": o_context.input_context,
        }

        return {
            "message": "http_node_ok",
            "output": o_response_payload,
            "value": o_response_payload,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "response",
                "node_outputs": {
                    "output_main": o_response_payload,
                },
            },
        }

    def _extract_http_headers(self, o_data: Dict[str, Any]) -> Dict[str, str]:
        o_headers = o_data.get("headers", o_data.get("d_headers", {}))

        if isinstance(o_headers, dict):
            d_result: Dict[str, str] = {}
            for s_key, o_value in o_headers.items():
                s_safe_key = str(s_key).strip()
                if s_safe_key == "":
                    continue
                d_result[s_safe_key] = str(o_value).strip()
            return d_result

        if isinstance(o_headers, str) and o_headers.strip() != "":
            o_parsed = try_parse_json_string(o_headers.strip())
            if isinstance(o_parsed, dict):
                d_result: Dict[str, str] = {}
                for s_key, o_value in o_parsed.items():
                    s_safe_key = str(s_key).strip()
                    if s_safe_key == "":
                        continue
                    d_result[s_safe_key] = str(o_value).strip()
                return d_result

        return {}

    def _sanitize_http_headers(self, d_headers: Dict[str, str]) -> Dict[str, str]:
        d_result: Dict[str, str] = {}
        a_blocked_headers = {
            "host",
            "content-length",
            "connection",
            "transfer-encoding",
        }

        for s_key, s_value in d_headers.items():
            s_safe_key = str(s_key).strip()
            s_safe_value = str(s_value).strip()

            if s_safe_key == "":
                continue
            if len(s_safe_key) > 100 or len(s_safe_value) > 5000:
                raise ValueError("http_header_invalid_length")
            if "\r" in s_safe_key or "\n" in s_safe_key or "\r" in s_safe_value or "\n" in s_safe_value:
                raise ValueError("http_header_invalid_chars")
            if s_safe_key.lower() in a_blocked_headers:
                continue

            d_result[s_safe_key] = s_safe_value

        return d_result

    def _sanitize_response_headers(self, d_headers: Dict[str, Any]) -> Dict[str, str]:
        d_result: Dict[str, str] = {}

        for s_key, o_value in d_headers.items():
            s_safe_key = str(s_key).strip()
            if s_safe_key == "":
                continue
            d_result[s_safe_key] = str(o_value).strip()[:2000]

        return d_result
