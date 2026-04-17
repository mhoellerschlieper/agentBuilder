# file: backend/nodes/switch/node_impl.py
# description: Switch Node Implementierung.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper

import copy
import json
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import extract_primary_named_input, replace_input_placeholders, sanitize_handle_key


class SwitchNode(BaseNode):
    def get_node_type(self) -> str:
        return "switch"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "input_main", "s_label": "check_data", "s_description": "data for switch"}]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "output_main", "s_label": "result", "s_description": "default result"},
            {"s_key": "default", "s_label": "default", "s_description": "default path"},
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        a_cases = o_data.get("cases", [])
        if not isinstance(a_cases, list):
            a_cases = []

        s_default = str(o_data.get("s_default", "default")).strip() or "default"
        o_primary_input = extract_primary_named_input(o_context.input_context)

        s_input_value = ""
        if isinstance(o_primary_input, dict):
            if "value" in o_primary_input:
                s_input_value = str(o_primary_input.get("value", "")).strip()
            else:
                try:
                    s_input_value = json.dumps(o_primary_input, ensure_ascii=True)
                except Exception:
                    s_input_value = str(o_primary_input)
        elif o_primary_input is not None:
            s_input_value = str(o_primary_input).strip()

        s_selected_handle = sanitize_handle_key(s_default)
        if s_selected_handle == "":
            s_selected_handle = "default"

        s_selected_case_value = ""
        a_normalized_cases: List[Dict[str, Any]] = []

        for i_index, o_case in enumerate(a_cases):
            if not isinstance(o_case, dict):
                continue

            s_case_value = str(o_case.get("s_value", "")).strip()
            s_handle_key = f"case_{i_index + 1}"

            a_normalized_cases.append(
                {
                    "s_handle_key": s_handle_key,
                    "s_value": s_case_value,
                    "s_id": str(o_case.get("s_id", "")).strip(),
                }
            )

            if s_case_value != "" and s_input_value == s_case_value:
                s_selected_handle = s_handle_key
                s_selected_case_value = s_case_value
                break

        if isinstance(o_primary_input, dict):
            o_passthrough_output = copy.deepcopy(o_primary_input)
        else:
            o_passthrough_output = {"value": o_primary_input}

        o_main_output = {
            **copy.deepcopy(o_passthrough_output),
            "selected_handle": s_selected_handle,
            "selected_case_value": s_selected_case_value,
            "switch_input_value": s_input_value,
            "resolved_data": {
                **o_data,
                "cases": a_normalized_cases,
            },
            "inputs_used": o_context.input_context,
        }

        d_node_outputs: Dict[str, Any] = {
            "output_main": o_main_output,
            "default": {
                **copy.deepcopy(o_passthrough_output),
                "selected_handle": "default",
                "selected_case_value": "",
            },
        }

        for o_case in a_normalized_cases:
            s_case_handle_key = str(o_case.get("s_handle_key", "")).strip()
            if s_case_handle_key == "":
                continue

            d_node_outputs[s_case_handle_key] = {
                **copy.deepcopy(o_passthrough_output),
                "selected_handle": s_case_handle_key,
                "selected_case_value": str(o_case.get("s_value", "")).strip(),
            }

        return {
            "message": "switch_node_ok",
            "output": o_main_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "result",
                "node_outputs": d_node_outputs,
            },
        }
