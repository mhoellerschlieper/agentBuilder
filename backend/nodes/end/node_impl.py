# file: backend/nodes/end/node_impl.py
# description: End Node Implementierung mit zentral vorbereiteter Template Syntax
# und sicherer Rueckgabe fuer Frontend Ergebnisse.
# history:
# - 2026-04-14: Erste ausgelagerte Version. author Marcus Schlieper
# - 2026-05-01: Doppelte Placeholder Aufloesung entfernt und auf zentral
#   aufgeloeste Node Daten umgestellt. author Marcus Schlieper
# - 2026-05-01: Konsistente output_meta.node_outputs Rueckgabe auch fuer
#   Fallback Ergebnis ergaenzt. author Marcus Schlieper
# author Marcus Schlieper

import copy
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode


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
        # history:
        # - 2026-05-01: Die neue Template Syntax wird zentral im Workflow Runner
        #   aufgeloest. Diese Node arbeitet nur noch mit vorbereiteten Daten.
        #   author Marcus Schlieper

        o_data = copy.deepcopy(o_context.node.get("data", {}))

        s_result_template = self._extract_result_template(o_data)
        o_named_inputs = self._get_safe_dict(
            o_context.input_context.get("named_inputs", {})
        )
        o_inputs = o_context.input_context.get("inputs", [])

        if s_result_template.strip() != "":
            o_resolved_result = s_result_template
            o_output_main = {
                "result": o_resolved_result,
                "frontend_result": o_resolved_result,
                "named_frontend_result": copy.deepcopy(o_named_inputs),
                "resolved_data": {
                    **o_data,
                    "s_result": s_result_template,
                },
            }
            return {
                "message": "end_node_ok",
                "output": o_output_main,
                "value": o_output_main,
                "output_meta": {
                    "output_key": "output_main",
                    "output_label": "frontend_result",
                    "node_outputs": {
                        "output_main": o_output_main,
                    },
                },
            }

        o_output_main = {
            "frontend_result": copy.deepcopy(o_inputs),
            "named_frontend_result": copy.deepcopy(o_named_inputs),
            "resolved_data": copy.deepcopy(o_data),
        }

        return {
            "message": "end_node_ok",
            "output": o_output_main,
            "value": o_output_main,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "frontend_result",
                "node_outputs": {
                    "output_main": o_output_main,
                },
            },
        }

    def _extract_result_template(self, o_data: Dict[str, Any]) -> str:
        # Liest moegliche Ergebnisfelder robust aus.
        if "s_result" in o_data:
            return str(o_data.get("s_result", ""))
        if "result" in o_data:
            return str(o_data.get("result", ""))
        if "s_query" in o_data:
            return str(o_data.get("s_query", ""))
        return ""

    def _get_safe_dict(self, o_value: Any) -> Dict[str, Any]:
        # Sichert ab, dass fuer das Frontend immer ein Dict genutzt wird.
        if isinstance(o_value, dict):
            return o_value
        return {}
