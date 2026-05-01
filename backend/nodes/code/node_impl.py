# file: backend/nodes/code/node_impl.py
# description: Code Node Implementierung mit sicherer Simulation.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper

import copy
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode

class CodeNode(BaseNode):
    def get_node_type(self) -> str:
        return "code"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "input_main", "s_label": "data", "s_description": "main data"},
            {"s_key": "input_config", "s_label": "config", "s_description": "optional config"},
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {"s_key": "output_main", "s_label": "result", "s_description": "result"},
            {"s_key": "output_error", "s_label": "error", "s_description": "error output"},
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        
        s_python_code = str(o_data.get("s_python_code", "")).strip()
        if len(s_python_code) > 20000:
            raise ValueError("code_too_large")

        a_forbidden_patterns = [
            "import os",
            "import sys",
            "subprocess",
            "exec(",
            "eval(",
            "__import__",
            "open(",
            "socket",
            "requests.",
        ]

        for s_pattern in a_forbidden_patterns:
            if s_pattern in s_python_code:
                return {
                    "message": "code_node_blocked",
                    "output": {
                        "blocked": True,
                        "reason": "unsafe_code_pattern_detected",
                        "matched_pattern": s_pattern,
                        "resolved_data": o_data,
                    },
                    "output_meta": {
                        "output_key": "output_error",
                        "output_label": "error",
                        "node_outputs": {
                            "output_main": {
                                "blocked": True,
                                "reason": "unsafe_code_pattern_detected",
                            },
                            "output_error": {
                                "blocked": True,
                                "reason": "unsafe_code_pattern_detected",
                                "matched_pattern": s_pattern,
                            },
                        },
                    },
                }

        o_simulated_result = {
            "executed": True,
            "engine": "safe_simulation_only",
            "code_length": len(s_python_code),
            "line_count": len(s_python_code.splitlines()) if s_python_code != "" else 0,
            "named_inputs": copy.deepcopy(o_context.input_context.get("named_inputs", {})),
            "resolved_data": o_data,
        }

        return {
            "message": "code_node_simulated",
            "output": o_simulated_result,
            "value": o_simulated_result,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "result",
                "node_outputs": {
                    "output_main": o_simulated_result,
                    "output_error": {
                        "blocked": False,
                        "reason": "",
                    },
                },
            },
        }
