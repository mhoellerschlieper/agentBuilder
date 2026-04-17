# file: backend/nodes/start/node_impl.py
# description: Start Node Implementierung.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper

import copy
import json
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import replace_input_placeholders


class StartNode(BaseNode):
    def get_node_type(self) -> str:
        return "start"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return []

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "start_data",
                "s_description": "data from start node",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        b_enable = bool(o_data.get("b_enable", True))
        if not b_enable:
            raise ValueError("start_node_disabled")

        a_outputs = o_data.get("a_outputs", [])
        if not isinstance(a_outputs, list) or len(a_outputs) == 0:
            a_outputs = [
                {
                    "s_key": "output_main",
                    "s_label": "start_data",
                    "s_description": "data from start node",
                    "s_type": "string",
                    "value": str(o_data.get("s_query", "")),
                }
            ]

        d_node_outputs: Dict[str, Any] = {}
        a_normalized_outputs: List[Dict[str, Any]] = []

        for i_index, o_item in enumerate(a_outputs):
            if not isinstance(o_item, dict):
                continue

            s_key = str(o_item.get("s_key", "")).strip()
            if s_key == "":
                s_key = "output_main" if i_index == 0 else f"output_{i_index + 1}"

            s_label = str(o_item.get("s_label", "")).strip() or s_key
            s_description = str(o_item.get("s_description", "")).strip()
            s_type = str(o_item.get("s_type", "string")).strip().lower() or "string"
            o_raw_value = o_item.get("value")
            o_parsed_value = self._parse_start_output_value(s_type, o_raw_value)

            o_output_payload = {
                "value": o_parsed_value,
                "type": s_type,
                "label": s_label,
                "description": s_description,
            }

            d_node_outputs[s_key] = o_output_payload
            a_normalized_outputs.append(
                {
                    "s_key": s_key,
                    "s_label": s_label,
                    "s_description": s_description,
                    "s_type": s_type,
                    "value": o_parsed_value,
                }
            )

        if len(d_node_outputs) == 0:
            raise ValueError("start_node_outputs_invalid")

        s_default_output_key = "output_main"
        if s_default_output_key not in d_node_outputs:
            s_default_output_key = list(d_node_outputs.keys())[0]

        return {
            "message": "start_node_ok",
            "output": {
                "query": str(o_data.get("s_query", "")).strip(),
                "array_obj_variable": o_data.get("s_array_obj_variable", ""),
                "outputs": a_normalized_outputs,
                "resolved_data": o_data,
                "inputs_used": o_context.input_context,
            },
            "output_meta": {
                "output_key": s_default_output_key,
                "output_label": str(d_node_outputs[s_default_output_key].get("label", "start_data")),
                "node_outputs": d_node_outputs,
            },
        }

    def _parse_start_output_value(self, s_type: str, o_raw_value: Any) -> Any:
        if s_type == "int":
            try:
                return int(o_raw_value)
            except Exception as o_exc:
                raise ValueError("start_output_int_invalid") from o_exc

        if s_type == "float":
            try:
                return float(o_raw_value)
            except Exception as o_exc:
                raise ValueError("start_output_float_invalid") from o_exc

        if s_type == "array":
            if isinstance(o_raw_value, list):
                return copy.deepcopy(o_raw_value)
            if isinstance(o_raw_value, str):
                try:
                    o_parsed = json.loads(o_raw_value)
                except Exception as o_exc:
                    raise ValueError("start_output_array_invalid_json") from o_exc
                if not isinstance(o_parsed, list):
                    raise ValueError("start_output_array_invalid_type")
                return o_parsed
            raise ValueError("start_output_array_invalid_type")

        if s_type == "object":
            if isinstance(o_raw_value, dict):
                return copy.deepcopy(o_raw_value)
            if isinstance(o_raw_value, str):
                try:
                    o_parsed = json.loads(o_raw_value)
                except Exception as o_exc:
                    raise ValueError("start_output_object_invalid_json") from o_exc
                if not isinstance(o_parsed, dict):
                    raise ValueError("start_output_object_invalid_type")
                return o_parsed
            raise ValueError("start_output_object_invalid_type")

        return str(o_raw_value if o_raw_value is not None else "")
