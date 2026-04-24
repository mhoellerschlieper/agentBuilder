# file: backend/nodes/tool_set_variable/node_impl.py
# description: Node zum Setzen eines Wertes als strukturierter Output fuer weitere Workflow Schritte.
# history:
# - 2026-04-24: Umbenennung von variable_tool auf tool_set_variable. author Marcus Schlieper
# - 2026-04-24: Typisierung, JSON Parsing und sichere Ausgabe beibehalten. author ChatGPT

import copy
import json
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import replace_input_placeholders


class ToolSetVariableNode(BaseNode):
    def get_node_type(self) -> str:
        return "tool_set_variable"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "input",
                "s_description": "optional input value",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "output",
                "s_description": "variable value",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        s_variable_name = str(o_data.get("s_variable_name", "variable_value")).strip() or "variable_value"
        s_value_type = str(o_data.get("s_value_type", "string")).strip().lower() or "string"
        s_value = str(o_data.get("s_value", "")).strip()

        if s_value_type not in ["string", "integer", "double", "boolean", "json"]:
            raise ValueError("variable_value_type_invalid")

        o_resolved_value = self._convert_value(
            s_value=s_value,
            s_value_type=s_value_type,
        )

        o_output = {
            "variable_name": s_variable_name,
            "value_type": s_value_type,
            "value": o_resolved_value,
            s_variable_name: o_resolved_value,
            "resolved_data": {
                **o_data,
            },
        }

        return {
            "message": "tool_set_variable_ok",
            "output": o_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "output",
                "node_outputs": {
                    "output_main": o_output,
                },
            },
        }

    def _convert_value(self, s_value: str, s_value_type: str) -> Any:
        # history:
        # - 2026-04-24: Erste zentrale Typkonvertierung erstellt. author ChatGPT
        # - 2026-04-24: Fuer tool_set_variable uebernommen. author Marcus Schlieper
        if s_value_type == "string":
            return s_value

        if s_value_type == "integer":
            try:
                return int(s_value)
            except Exception as o_exc:
                raise ValueError(f"variable_integer_invalid: {str(o_exc)}")

        if s_value_type == "double":
            try:
                return float(s_value)
            except Exception as o_exc:
                raise ValueError(f"variable_double_invalid: {str(o_exc)}")

        if s_value_type == "boolean":
            s_value_lower = s_value.lower()
            if s_value_lower in ["true", "1", "yes", "on"]:
                return True
            if s_value_lower in ["false", "0", "no", "off"]:
                return False
            raise ValueError("variable_boolean_invalid")

        if s_value_type == "json":
            try:
                return json.loads(s_value)
            except Exception as o_exc:
                raise ValueError(f"variable_json_invalid: {str(o_exc)}")

        raise ValueError("variable_value_type_invalid")
