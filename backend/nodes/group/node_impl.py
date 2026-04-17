# file: backend/nodes/group/node_impl.py
# description: Group Node Implementierung.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper

import copy
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import replace_input_placeholders


class GroupNode(BaseNode):
    def get_node_type(self) -> str:
        return "group"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "input_main", "s_label": "data", "s_description": "main data"}]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "output_main", "s_label": "result", "s_description": "group result"}]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        a_child_node_ids = o_data.get("child_node_ids", [])
        if not isinstance(a_child_node_ids, list):
            a_child_node_ids = []

        return {
            "message": "group_node_ok",
            "output": {
                "group_name": str(o_data.get("s_group_name", "")).strip(),
                "child_node_count": len(a_child_node_ids),
                "child_node_ids": copy.deepcopy(a_child_node_ids),
                "passthrough_inputs": copy.deepcopy(o_context.input_context.get("named_inputs", {})),
                "resolved_data": o_data,
            },
        }
