# file: backend/nodes/loop_for/node_impl.py
# description: Loop For Node Implementierung.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper

import copy
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import replace_input_placeholders, resolve_input_reference


class LoopForNode(BaseNode):
    def get_node_type(self) -> str:
        return "loop_for"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "input_main", "s_label": "data", "s_description": "data for loop"}]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "output_main", "s_label": "result", "s_description": "loop result"}]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        s_source_array_variable = str(o_data.get("s_source_array_variable", "")).strip()
        s_item_variable = str(o_data.get("s_item_variable", "item")).strip() or "item"
        s_index_variable = str(o_data.get("s_index_variable", "index")).strip() or "index"

        o_source_value = self._resolve_loop_source_value(
            s_source_array_variable,
            o_context.input_context,
        )

        if o_source_value is None:
            o_source_value = o_context.input_context.get("inputs", [])

        if not isinstance(o_source_value, list):
            if isinstance(o_source_value, dict):
                o_source_value = [o_source_value]
            else:
                raise ValueError("loop_for_source_not_array")

        if len(o_source_value) > 1000:
            raise ValueError("loop_for_source_too_large")

        a_items: List[Dict[str, Any]] = []
        for i_index, o_item in enumerate(o_source_value):
            a_items.append(
                {
                    s_item_variable: copy.deepcopy(o_item),
                    s_index_variable: i_index,
                }
            )

        return {
            "message": "loop_for_processed",
            "output": {
                "count": len(a_items),
                "items": a_items,
                "source_variable": s_source_array_variable,
                "item_variable": s_item_variable,
                "index_variable": s_index_variable,
                "resolved_data": o_data,
                "inputs_used": o_context.input_context,
            },
        }

    def _resolve_loop_source_value(self, s_source_array_variable: str, o_input_context: Dict[str, Any]) -> Any:
        if s_source_array_variable == "":
            return None

        if s_source_array_variable.startswith("{{input:") and s_source_array_variable.endswith("}}"):
            s_inner = s_source_array_variable[8:-2]
            return resolve_input_reference(o_input_context, s_inner)

        o_value = resolve_input_reference(o_input_context, s_source_array_variable)
        if o_value is not None:
            return o_value

        return None
