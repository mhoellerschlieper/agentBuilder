# file: backend/nodes/tool_text_sentinize/node_impl.py
# description: LLM basierter Node fuer Sentiment Analyse eines Textes.
# history:
# - 2026-04-24: Erste Version fuer tool_text_sentinize erstellt. author Marcus Schlieper
# - 2026-04-24: Label, Score und Begruendung als sichere JSON Antwort ergaenzt. author ChatGPT

import copy
import json
from typing import Any, Dict, List

from tools.LLM import llmTextGen
from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import (
    extract_primary_named_input,
)


class ToolTextSentinizeNode(BaseNode):
    def get_node_type(self) -> str:
        return "tool_text_sentinize"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "input",
                "s_description": "text for sentiment analysis",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "output",
                "s_description": "sentiment result",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        
        s_text = self._extract_text_from_input(extract_primary_named_input(o_context.input_context), o_data)
        if s_text.strip() == "":
            raise ValueError("sentiment_text_required")

        s_provider = str(o_data.get("s_provider", "openai")).strip().lower()
        s_model_name = str(o_data.get("s_model_name", "")).strip()
        s_api_key = str(o_data.get("s_api_key", "")).strip()
        s_api_host = str(o_data.get("s_api_host", "")).strip()
        i_timeout = int(o_data.get("i_timeout", 20000) or 20000)
        i_max_completion_tokens = int(o_data.get("max_completion_tokens", 1500) or 1500)

        if s_model_name == "":
            raise ValueError("model_name_required")

        o_response_schema = {
            "type": "json_schema",
            "json_schema": {
                "name": "sentiment_result",
                "schema": {
                    "type": "object",
                    "properties": {
                        "sentiment_label": {"type": "string"},
                        "sentiment_score": {"type": "number"},
                        "reason": {"type": "string"},
                    },
                    "required": ["sentiment_label", "sentiment_score", "reason"],
                    "additionalProperties": False,
                },
            },
        }

        s_system_prompt = (
            "You are a sentiment analysis system. "
            "Classify the sentiment of the text. "
            "Use labels positive, neutral, or negative. "
            "Return only valid JSON."
        )

        s_user_prompt = f"text:\n{s_text}"

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

        s_sentiment_label = str(o_result.get("sentiment_label", "")).strip().lower()
        s_reason = str(o_result.get("reason", "")).strip()

        try:
            d_sentiment_score = float(o_result.get("sentiment_score", 0.0))
        except Exception:
            d_sentiment_score = 0.0

        if d_sentiment_score < -1.0:
            d_sentiment_score = -1.0
        if d_sentiment_score > 1.0:
            d_sentiment_score = 1.0

        if s_sentiment_label not in ["positive", "neutral", "negative"]:
            s_sentiment_label = "neutral"

        o_output = {
            "sentiment_label": s_sentiment_label,
            "results": s_sentiment_label,
            "value": s_sentiment_label,
            "sentiment_score": d_sentiment_score,
            "reason": s_reason,
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
            "message": "tool_text_sentinize_ok",
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
