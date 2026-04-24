# file: backend/nodes/tool_show_variable/node_impl.py
# description: Node zum Anzeigen oder Durchreichen eines Wertes fuer UI und Debug Zwecke.
# history:
# - 2026-04-24: Umbenennung von show_tool auf tool_show_variable. author Marcus Schlieper
# - 2026-04-24: Sichere Textdarstellung und strukturierter Output beibehalten. author ChatGPT

import copy
import json
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import (
    extract_primary_named_input,
    replace_input_placeholders,
)


class ToolShowVariableNode(BaseNode):
    def get_node_type(self) -> str:
        return "tool_show_variable"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "input",
                "s_description": "value to show",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "output",
                "s_description": "shown value",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        s_title = str(o_data.get("s_title", "Output")).strip() or "Output"
        s_value = str(o_data.get("s_value", "")).strip()

        o_input_value = extract_primary_named_input(o_context.input_context)
        o_display_value = o_input_value

        if s_value != "":
            o_display_value = s_value

        s_display_text = self._stringify_value(o_display_value)

        o_output = {
            "title": s_title,
            "display_text": s_display_text,
            "display_value": o_display_value,
            "resolved_data": {
                **o_data,
            },
        }

        return {
            "message": "tool_show_variable_ok",
            "output": o_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "output",
                "node_outputs": {
                    "output_main": o_output,
                },
            },
        }

    def _stringify_value(self, o_value: Any) -> str:
        if isinstance(o_value, dict):
            try:
                return json.dumps(o_value, ensure_ascii=True, indent=2)
            except Exception:
                return str(o_value)

        if isinstance(o_value, list):
            try:
                return json.dumps(o_value, ensure_ascii=True, indent=2)
            except Exception:
                return str(o_value)

        if o_value is None:
            return ""

        return str(o_value)
