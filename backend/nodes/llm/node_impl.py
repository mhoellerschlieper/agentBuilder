# file: backend/nodes/llm/node_impl.py
# description: LLM Node Implementierung.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper


import copy
import json
from typing import Any, Dict, List

from tools.LLM import llmTextGen
from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import replace_input_placeholders


class LlmNode(BaseNode):
    def get_node_type(self) -> str:
        return "llm"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "input_main", "s_label": "prompt_data", "s_description": "main data"},
            {"s_key": "input_context", "s_label": "context", "s_description": "extra context"},
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "output_main", "s_label": "response", "s_description": "llm response"},
            {"s_key": "tools", "s_label": "tools", "s_description": "tool calls"},
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        s_model = str(o_data.get("s_model_name", "")).strip()
        s_api_key = str(o_data.get("s_api_key", "")).strip()
        s_api_host = str(o_data.get("s_api_host", "")).strip()
        d_temperature = float(str(o_data.get("d_temperature", "0")).strip() or "0")
        s_system_prompt = str(o_data.get("s_system_prompt", "")).strip()
        s_prompt = str(o_data.get("s_prompt", "")).strip()
        s_result_variable = str(o_data.get("s_result_variable", "")).strip()
        b_show_use_tool = bool(o_data.get("b_show_use_tool", False))
        b_show_use_memory = bool(o_data.get("b_show_use_memory", False))
        i_timeout = int(o_data.get("i_timeout", 20000) or 20000)
        s_provider = str(o_data.get("s_provider", "openai")).strip().lower()

        if s_model == "":
            raise ValueError("llm_model_required")

        a_messages: List[Dict[str, str]] = []

        if s_system_prompt != "":
            a_messages.append(
                {
                    "role": "system",
                    "content": s_system_prompt,
                }
            )

        if s_prompt != "":
            a_messages.append(
                {
                    "role": "user",
                    "content": s_prompt,
                }
            )
        else:
            a_messages.append(
                {
                    "role": "user",
                    "content": json.dumps(
                        o_context.input_context.get("named_inputs", {}),
                        ensure_ascii=True,
                    ),
                }
            )

        s_response_text, d_token = llmTextGen(
            model=s_model,
            messages=a_messages,
            max_completion_tokens=int(o_data.get("max_completion_tokens", 16000) or 16000),
            timeout=i_timeout,
            response_format={"type": "text"},
            s_provider=s_provider,
            s_endpoint_url=s_api_host if s_provider == "endpoint" else "",
            s_endpoint_api_key=s_api_key if s_provider == "endpoint" else "",
            d_endpoint_headers=None,
        )

        a_tool_calls: List[Dict[str, Any]] = []

        if b_show_use_tool:
            a_tool_calls.append(
                {
                    "s_tool_name": "simulated_tool",
                    "s_reason": "llm_requested_tool_usage",
                    "input_preview": copy.deepcopy(o_context.input_context.get("named_inputs", {})),
                }
            )

        if b_show_use_memory:
            a_tool_calls.append(
                {
                    "s_tool_name": "simulated_memory",
                    "s_reason": "llm_requested_memory_usage",
                    "input_preview": copy.deepcopy(o_context.input_context.get("named_inputs", {})),
                }
            )

        o_main_output = {
            "results": s_response_text,
            "model": s_model,
            "provider": s_provider,
            "temperature": d_temperature,
            "system_prompt_present": s_system_prompt != "",
            "prompt_present": s_prompt != "",
            "api_host_present": s_api_host != "",
            "api_key_present": s_api_key != "",
            "result_variable": s_result_variable,
            "token_usage": d_token,
            "resolved_data": {
                **o_data,
                "s_api_key": "***" if s_api_key != "" else "",
            },
            "inputs_used": o_context.input_context,
        }

        return {
            "message": "llm_node_ok",
            "output": o_main_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "response",
                "node_outputs": {
                    "output_main": o_main_output,
                    "tools": {
                        "tool_calls": a_tool_calls,
                        "tool_count": len(a_tool_calls),
                    },
                },
            },
        }
