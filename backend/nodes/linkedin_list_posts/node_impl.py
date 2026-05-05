# file: backend/nodes/linkedin_list_posts/node_impl.py
# description: LinkedIn Node zum Laden der letzten eigenen Posts ueber eine HTTP API.
# history:
# - 2026-05-04: Erste Version fuer sicheres Laden der letzten eigenen LinkedIn Posts. author Marcus Schlieper
# author Marcus Schlieper

import copy
from typing import Any, Dict, List
import requests

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import validate_safe_outbound_url


class LinkedinListPostsNode(BaseNode):
    # Laedt die letzten eigenen LinkedIn Posts ueber eine konfigurierbare API.
    def get_node_type(self) -> str:
        return "linkedin_list_posts"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "request",
                "s_description": "main input",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "posts",
                "s_description": "linkedin posts result",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        # history:
        # - 2026-05-04: Sichere API Ausfuehrung und Ergebnis Normalisierung ergaenzt. author Marcus Schlieper
        o_data = copy.deepcopy(o_context.node.get("data", {}))

        s_base_url = str(
            o_data.get("s_base_url", "https://api.linkedin.com")
        ).strip()
        s_list_path = str(
            o_data.get("s_list_path", "/v2/posts")
        ).strip()
        s_access_token = str(
            o_data.get("s_access_token", "")
        ).strip()
        s_author_urn = str(
            o_data.get("s_author_urn", "")
        ).strip()

        i_limit_raw = int(o_data.get("i_limit", 5) or 5)
        i_timeout_raw = int(o_data.get("i_timeout", 30000) or 30000)

        if s_access_token == "":
            raise ValueError("linkedin_access_token_required")

        if s_author_urn == "":
            raise ValueError("linkedin_author_urn_required")

        if i_limit_raw < 1 or i_limit_raw > 50:
            raise ValueError("linkedin_limit_out_of_range")

        if i_timeout_raw < 1000 or i_timeout_raw > 300000:
            raise ValueError("linkedin_timeout_out_of_range")

        s_url = self._build_url(s_base_url, s_list_path)
        validate_safe_outbound_url(s_url)

        d_headers = {
            "Authorization": f"Bearer {s_access_token}",
            "Accept": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        }

        d_params = {
            "q": "author",
            "author": s_author_urn,
            "count": i_limit_raw,
            "sortBy": "LAST_MODIFIED",
        }

        try:
            o_response = requests.get(
                s_url,
                headers=d_headers,
                params=d_params,
                timeout=i_timeout_raw / 1000.0,
                allow_redirects=False,
            )
        except requests.Timeout as o_exc:
            raise ValueError("linkedin_list_posts_timeout") from o_exc
        except requests.RequestException as o_exc:
            raise ValueError(f"linkedin_list_posts_request_failed:{str(o_exc)}") from o_exc

        s_response_text = o_response.text[:200000]

        if not o_response.ok:
            raise ValueError(
                f"linkedin_list_posts_http_{int(o_response.status_code)}:{s_response_text[:1000]}"
            )

        try:
            o_payload = o_response.json()
        except Exception as o_exc:
            raise ValueError("linkedin_list_posts_invalid_json") from o_exc

        a_elements = []
        if isinstance(o_payload, dict):
            o_elements = o_payload.get("elements", [])
            if isinstance(o_elements, list):
                a_elements = o_elements

        a_posts = self._normalize_posts(a_elements, i_limit_raw)

        o_output = {
            "posts": a_posts,
            "count": len(a_posts),
            "author_urn": s_author_urn,
            "api_url": s_url,
            "resolved_data": o_data,
            "inputs_used": o_context.input_context,
        }

        return {
            "message": "linkedin_list_posts_ok",
            "output": o_output,
            "value": o_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "posts",
                "node_outputs": {
                    "output_main": o_output,
                },
            },
        }

    def _build_url(self, s_base_url: str, s_list_path: str) -> str:
        s_safe_base_url = s_base_url.rstrip("/")
        s_safe_list_path = s_list_path.strip()

        if s_safe_list_path == "":
            raise ValueError("linkedin_list_path_required")

        if not s_safe_list_path.startswith("/"):
            s_safe_list_path = "/" + s_safe_list_path

        return s_safe_base_url + s_safe_list_path

    def _normalize_posts(
        self,
        a_elements: List[Any],
        i_limit: int,
    ) -> List[Dict[str, Any]]:
        a_result: List[Dict[str, Any]] = []

        for o_item in a_elements:
            if not isinstance(o_item, dict):
                continue

            s_post_id = self._extract_post_id(o_item)
            s_text = self._extract_post_text(o_item)
            s_created_at = str(
                o_item.get("createdAt", o_item.get("lastModifiedAt", ""))
            ).strip()
            s_permalink = str(
                o_item.get("permalink", o_item.get("url", ""))
            ).strip()

            if s_post_id == "":
                continue

            a_result.append(
                {
                    "post_id": s_post_id,
                    "text": s_text,
                    "created_at": s_created_at,
                    "post_url": s_permalink,
                    "raw_item": o_item,
                }
            )

            if len(a_result) >= i_limit:
                break

        return a_result

    def _extract_post_id(self, o_item: Dict[str, Any]) -> str:
        s_post_id = str(
            o_item.get("id", o_item.get("urn", o_item.get("activity", "")))
        ).strip()
        return s_post_id

    def _extract_post_text(self, o_item: Dict[str, Any]) -> str:
        o_commentary = o_item.get("commentary", {})
        if isinstance(o_commentary, dict):
            s_text = str(
                o_commentary.get("text", "")
            ).strip()
            if s_text != "":
                return s_text[:5000]

        o_specific = o_item.get("specificContent", {})
        if isinstance(o_specific, dict):
            o_share_content = o_specific.get(
                "com.linkedin.ugc.ShareContent", {}
            )
            if isinstance(o_share_content, dict):
                o_share_commentary = o_share_content.get("shareCommentary", {})
                if isinstance(o_share_commentary, dict):
                    s_text = str(
                        o_share_commentary.get("text", "")
                    ).strip()
                    if s_text != "":
                        return s_text[:5000]

        return ""
