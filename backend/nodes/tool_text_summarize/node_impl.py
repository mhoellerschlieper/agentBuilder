# file: backend/nodes/tool_text_summarize/node_impl.py
# description: LLM basierter Node fuer Text Zusammenfassung.
# history:
# - 2026-04-24: Erste Version fuer tool_text_summarize erstellt. author Marcus Schlieper
# - 2026-04-24: Stiloptionen und sichere JSON Antwort ergaenzt. author ChatGPT

import copy
import json
from typing import Any, Dict, List

from tools.LLM import llmTextGen
from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import (
    extract_primary_named_input,
)


class ToolTextSummarizeNode(BaseNode):
    def get_node_type(self) -> str:
        return "tool_text_summarize"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "input",
                "s_description": "text for summary",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "output",
                "s_description": "summary result",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        
        s_text = self._extract_text_from_input(extract_primary_named_input(o_context.input_context), o_data)
        if s_text.strip() == "":
            raise ValueError("summary_text_required")

        s_summary_style = str(o_data.get("s_summary_style", "short")).strip() or "short"
        s_provider = str(o_data.get("s_provider", "openai")).strip().lower()
        s_model_name = str(o_data.get("s_model_name", "")).strip()
        s_api_key = str(o_data.get("s_api_key", "")).strip()
        s_api_host = str(o_data.get("s_api_host", "")).strip()
        i_timeout = int(o_data.get("i_timeout", 20000) or 20000)
        i_max_completion_tokens = int(o_data.get("max_completion_tokens", 2000) or 2000)

        if s_model_name == "":
            raise ValueError("model_name_required")

        o_response_schema = {
            "type": "json_schema",
            "json_schema": {
                "name": "summarize_result",
                "schema": {
                    "type": "object",
                    "properties": {
                        "summary_text": {"type": "string"},
                    },
                    "required": ["summary_text"],
                    "additionalProperties": False,
                },
            },
        }

        s_system_prompt = (
            "You are a text summarization system. "
            "Create a concise and accurate summary. "
            "Return only valid JSON."
        )

        s_user_prompt = (
            f"summary_style: {s_summary_style}\n"
            f"text:\n{s_text}"
        )

        a_messages = [
            {"role": "system", "content": s_system_prompt},
            {"role": "user", "content": s_user_prompt},
        ]

        s_response_text, d_token = llmTextGen(
            model=s_model_name,
            messages=a_messages,
            max_completion_tokens=i_max_completion_tokens,
            timeout=i_timeout,
            response_format=o_response_schema,
            s_provider=s_provider,
            s_endpoint_url=s_api_host if s_provider == "endpoint" else "",
            s_endpoint_api_key=s_api_key if s_provider == "endpoint" else "",
            d_endpoint_headers=None,
        )

        o_result = self._parse_json_object(s_response_text)
        s_summary_text = str(o_result.get("summary_text", "")).strip()

        o_output = {
            "summary_text": s_summary_text,
            "results": s_summary_text,
            "value": s_summary_text,
            "summary_style": s_summary_style,
            "source_text": s_text,
            "llm_meta": {
                "raw_response": s_response_text,
                "token_usage": d_token,
                "model_name": s_model_name,
                "provider": s_provider,
            },
            "resolved_data": {
                **o_data,
                "s_api_key": "***" if s_api_key != "" else "",
            },
        }

        return {
            "message": "tool_text_summarize_ok",
            "output": o_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "output",
                "node_outputs": {
                    "output_main": o_output,
                },
            },
        }

    def _extract_text_from_input(self, o_input: Any, o_data: Dict[str, Any]) -> str:
        s_text_field = str(o_data.get("s_text", "")).strip()
        if s_text_field != "":
            return s_text_field

        if isinstance(o_input, dict):
            if "text" in o_input:
                return str(o_input.get("text", ""))
            if "value" in o_input:
                return str(o_input.get("value", ""))
            try:
                return json.dumps(o_input, ensure_ascii=True)
            except Exception:
                return str(o_input)

        if o_input is None:
            return ""

        return str(o_input)

    def _parse_json_object(self, s_response_text: str) -> Dict[str, Any]:
        s_clean = s_response_text.strip()
        if s_clean == "":
            raise ValueError("empty_llm_response")

        o_parsed = json.loads(s_clean)
        if not isinstance(o_parsed, dict):
            raise ValueError("llm_response_not_object")

        return o_parsed
