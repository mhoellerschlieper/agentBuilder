# file: backend/nodes/comment/node_impl.py
# description: Comment Node Implementierung.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper

import copy
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import replace_input_placeholders


class CommentNode(BaseNode):
    def get_node_type(self) -> str:
        return "comment"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "input_main", "s_label": "data", "s_description": "optional data"}]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "output_main", "s_label": "result", "s_description": "comment result"}]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        o_data = replace_input_placeholders(o_data, o_context.input_context)

        return {
            "message": "comment_node_ok",
            "output": {
                "s_text": str(o_data.get("s_text", "")).strip(),
                "s_color": str(o_data.get("s_color", "")).strip(),
                "resolved_data": o_data,
                "inputs_used": o_context.input_context,
            },
        }
