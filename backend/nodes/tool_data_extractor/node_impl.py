# file: backend/nodes/tool_data_extractor/node_impl.py
# description: LLM basierter Node fuer strukturierte Datenextraktion in ein vorgegebenes JSON.
# history:
# - 2026-04-24: Erste Version fuer tool_data_extractor erstellt. author Marcus Schlieper
# - 2026-04-24: Annotationen, Nebenbedingungen und sichere JSON Verarbeitung ergaenzt. author ChatGPT
# - 2026-05-01: Vorbereitung fuer zentrale Template Syntax Aufloesung im Workflow Runner. author Marcus Schlieper

import copy
import json
from typing import Any, Dict, List

from tools.LLM import llmTextGen
from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import extract_primary_named_input


class ToolDataExtractorNode(BaseNode):
    def get_node_type(self) -> str:
        return "tool_data_extractor"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "input",
                "s_description": "text for extraction",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "output",
                "s_description": "extracted json",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        # Hinweis:
        # Die neue Template Syntax wird zentral im Workflow Runner aufgeloest.
        o_data = copy.deepcopy(o_context.node.get("data", {}))

        s_text = self._extract_text_from_input(
            extract_primary_named_input(o_context.input_context),
            o_data,
        )
        if s_text.strip() == "":
            raise ValueError("extractor_text_required")

        s_json_template = str(o_data.get("s_json_template", "")).strip()
        if s_json_template == "":
            raise ValueError("json_template_required")

        s_annotation = str(o_data.get("s_annotation", "")).strip()
        s_provider = str(o_data.get("s_provider", "openai")).strip().lower()
        s_model_name = str(o_data.get("s_model_name", "")).strip()
        s_api_key = str(o_data.get("s_api_key", "")).strip()
        s_api_host = str(o_data.get("s_api_host", "")).strip()
        i_timeout = int(o_data.get("i_timeout", 20000) or 20000)
        i_max_completion_tokens = int(o_data.get("max_completion_tokens", 4000) or 4000)

        if s_model_name == "":
            raise ValueError("model_name_required")

        o_template_object = self._parse_json_template(s_json_template)

        o_response_schema = {
            "type": "json_schema",
            "json_schema": {
                "name": "data_extractor_result",
                "schema": {
                    "type": "object",
                    "properties": {
                        "data": {
                            "type": "object"
                        }
                    },
                    "required": ["data"],
                    "additionalProperties": False,
                },
            },
        }

        s_system_prompt = (
            "You are a structured data extraction system. "
            "Fill the given JSON template only with information found in the text. "
            "Do not invent values. "
            "Keep missing values unchanged if the template already contains placeholders, nulls, or empty values. "
            "Return only valid JSON."
        )

        s_user_prompt = (
            "json_template:\n"
            f"{json.dumps(o_template_object, ensure_ascii=True)}\n\n"
            "annotation:\n"
            f"{s_annotation}\n\n"
            "text:\n"
            f"{s_text}"
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
        o_extracted_data = o_result.get("data")

        if not isinstance(o_extracted_data, dict):
            raise ValueError("extracted_data_not_object")

        o_output = {
            "data": o_extracted_data,
            "results": o_extracted_data,
            "json_template": o_template_object,
            "annotation": s_annotation,
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
            "message": "tool_data_extractor_ok",
            "output": o_output,
            "value": o_output,
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

    def _parse_json_template(self, s_json_template: str) -> Dict[str, Any]:
        try:
            o_template = json.loads(s_json_template)
        except Exception as o_exc:
            raise ValueError(f"json_template_invalid: {str(o_exc)}")

        if not isinstance(o_template, dict):
            raise ValueError("json_template_must_be_object")

        return o_template

    def _parse_json_object(self, s_response_text: str) -> Dict[str, Any]:
        s_clean = s_response_text.strip()
        if s_clean == "":
            raise ValueError("empty_llm_response")

        o_parsed = json.loads(s_clean)
        if not isinstance(o_parsed, dict):
            raise ValueError("llm_response_not_object")

        return o_parsed
