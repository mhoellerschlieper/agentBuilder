# file: backend/nodes/linkedin_repost_post/node_impl.py
# description: LinkedIn Node zum Reposten eines bestehenden Posts ueber eine HTTP API.
# history:
# - 2026-05-04: Erste Version fuer sicheres Reposten eines LinkedIn Posts. author Marcus Schlieper
# author Marcus Schlieper

import copy
from typing import Any, Dict, List
import requests

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import validate_safe_outbound_url


class LinkedinRepostPostNode(BaseNode):
    # Repostet einen einzelnen LinkedIn Post ueber eine konfigurierbare API.
    def get_node_type(self) -> str:
        return "linkedin_repost_post"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "post",
                "s_description": "post input",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "repost_result",
                "s_description": "linkedin repost result",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        # history:
        # - 2026-05-04: Payload Aufbau, Validierung und sichere HTTP Ausfuehrung ergaenzt. author Marcus Schlieper
        o_data = copy.deepcopy(o_context.node.get("data", {}))

        s_base_url = str(
            o_data.get("s_base_url", "https://api.linkedin.com")
        ).strip()
        s_repost_path = str(
            o_data.get("s_repost_path", "/v2/posts")
        ).strip()
        s_access_token = str(
            o_data.get("s_access_token", "")
        ).strip()
        s_author_urn = str(
            o_data.get("s_author_urn", "")
        ).strip()
        s_post_id = str(
            o_data.get("s_post_id", "")
        ).strip()
        s_comment = str(
            o_data.get("s_comment", "")
        ).strip()

        i_timeout_raw = int(o_data.get("i_timeout", 30000) or 30000)

        if s_access_token == "":
            raise ValueError("linkedin_access_token_required")

        if s_author_urn == "":
            raise ValueError("linkedin_author_urn_required")

        if s_post_id == "":
            raise ValueError("linkedin_post_id_required")

        if len(s_comment) > 3000:
            raise ValueError("linkedin_comment_too_long")

        if i_timeout_raw < 1000 or i_timeout_raw > 300000:
            raise ValueError("linkedin_timeout_out_of_range")

        s_url = self._build_url(s_base_url, s_repost_path)
        validate_safe_outbound_url(s_url)

        d_headers = {
            "Authorization": f"Bearer {s_access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        }

        d_payload = self._build_repost_payload(
            s_author_urn=s_author_urn,
            s_post_id=s_post_id,
            s_comment=s_comment,
        )

        try:
            o_response = requests.post(
                s_url,
                headers=d_headers,
                json=d_payload,
                timeout=i_timeout_raw / 1000.0,
                allow_redirects=False,
            )
        except requests.Timeout as o_exc:
            raise ValueError("linkedin_repost_post_timeout") from o_exc
        except requests.RequestException as o_exc:
            raise ValueError(f"linkedin_repost_post_request_failed:{str(o_exc)}") from o_exc

        s_response_text = o_response.text[:200000]

        if not o_response.ok:
            raise ValueError(
                f"linkedin_repost_post_http_{int(o_response.status_code)}:{s_response_text[:1000]}"
            )

        o_response_json: Any = None
        try:
            if s_response_text.strip() != "":
                o_response_json = o_response.json()
        except Exception:
            o_response_json = None

        s_repost_id = self._extract_repost_id(o_response, o_response_json)

        o_output = {
            "repost_id": s_repost_id,
            "status_code": int(o_response.status_code),
            "ok": bool(o_response.ok),
            "author_urn": s_author_urn,
            "source_post_id": s_post_id,
            "comment": s_comment,
            "response_text": s_response_text[:5000],
            "response_json": o_response_json,
            "request_payload": d_payload,
            "resolved_data": o_data,
            "inputs_used": o_context.input_context,
        }

        return {
            "message": "linkedin_repost_post_ok",
            "output": o_output,
            "value": o_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "repost_result",
                "node_outputs": {
                    "output_main": o_output,
                },
            },
        }

    def _build_url(self, s_base_url: str, s_repost_path: str) -> str:
        s_safe_base_url = s_base_url.rstrip("/")
        s_safe_repost_path = s_repost_path.strip()

        if s_safe_repost_path == "":
            raise ValueError("linkedin_repost_path_required")

        if not s_safe_repost_path.startswith("/"):
            s_safe_repost_path = "/" + s_safe_repost_path

        return s_safe_base_url + s_safe_repost_path

    def _build_repost_payload(
        self,
        s_author_urn: str,
        s_post_id: str,
        s_comment: str,
    ) -> Dict[str, Any]:
        d_payload: Dict[str, Any] = {
            "author": s_author_urn,
            "visibility": "PUBLIC",
            "distribution": {
                "feedDistribution": "MAIN_FEED",
                "targetEntities": [],
                "thirdPartyDistributionChannels": [],
            },
            "reshareContext": {
                "parent": s_post_id,
            },
            "lifecycleState": "PUBLISHED",
            "isReshareDisabledByAuthor": False,
        }

        if s_comment != "":
            d_payload["commentary"] = {
                "text": s_comment,
            }

        return d_payload

    def _extract_repost_id(
        self,
        o_response: requests.Response,
        o_response_json: Any,
    ) -> str:
        if isinstance(o_response_json, dict):
            s_repost_id = str(
                o_response_json.get("id", o_response_json.get("urn", ""))
            ).strip()
            if s_repost_id != "":
                return s_repost_id

        s_header_id = str(o_response.headers.get("x-restli-id", "")).strip()
        if s_header_id != "":
            return s_header_id

        s_location = str(o_response.headers.get("location", "")).strip()
        if s_location != "":
            return s_location

        return ""
