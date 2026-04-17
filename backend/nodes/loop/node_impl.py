# file: backend/nodes/loop/node_impl.py
# description: Loop Node Implementierung.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper

import copy
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import replace_input_placeholders


class LoopNode(BaseNode):
    def get_node_type(self) -> str:
        return "loop"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "input_main", "s_label": "data", "s_description": "data for loop"}]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "output_main", "s_label": "result", "s_description": "loop result"}]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        i_count = int(o_data.get("count", o_data.get("i_count", 0)) or 0)
        if i_count < 0 or i_count > 1000:
            raise ValueError("loop_count_out_of_range")

        a_items: List[Dict[str, Any]] = []
        for i_index in range(i_count):
            a_items.append(
                {
                    "i_index": i_index,
                    "s_iteration_label": f"iteration_{i_index}",
                    "named_inputs_snapshot": copy.deepcopy(o_context.input_context.get("named_inputs", {})),
                }
            )

        return {
            "message": "loop_processed",
            "output": {
                "count": i_count,
                "items": a_items,
                "first_item": a_items[0] if len(a_items) > 0 else None,
                "last_item": a_items[-1] if len(a_items) > 0 else None,
                "resolved_data": o_data,
                "inputs_used": o_context.input_context,
            },
        }
