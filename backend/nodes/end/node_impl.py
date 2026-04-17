# file: backend/nodes/end/node_impl.py
# description: End Node Implementierung.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper

import copy
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import replace_input_placeholders


class EndNode(BaseNode):
    def get_node_type(self) -> str:
        return "end"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "final_result",
                "s_description": "final workflow data",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "frontend_result",
                "s_description": "result for frontend",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))

        s_result_template = ""
        if "s_result" in o_data:
            s_result_template = str(o_data.get("s_result", ""))
        elif "result" in o_data:
            s_result_template = str(o_data.get("result", ""))
        elif "s_query" in o_data and str(o_data.get("s_query", "")).strip().startswith("{{input:"):
            s_result_template = str(o_data.get("s_query", ""))

        if s_result_template.strip() != "":
            o_resolved_result = replace_input_placeholders(
                s_result_template,
                o_context.input_context,
            )
            return {
                "message": "end_node_ok",
                "output": {
                    "result": o_resolved_result,
                    "frontend_result": o_resolved_result,
                    "named_frontend_result": copy.deepcopy(o_context.input_context.get("named_inputs", {})),
                    "resolved_data": {
                        **o_data,
                        "s_result": s_result_template,
                    },
                },
                "output_meta": {
                    "output_key": "output_main",
                    "output_label": "frontend_result",
                    "node_outputs": {
                        "output_main": {
                            "result": o_resolved_result,
                            "frontend_result": o_resolved_result,
                        },
                    },
                },
            }

        return {
            "message": "end_node_ok",
            "output": {
                "frontend_result": o_context.input_context.get("inputs", []),
                "named_frontend_result": o_context.input_context.get("named_inputs", {}),
                "resolved_data": o_data,
            },
        }
