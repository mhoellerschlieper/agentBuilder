# file: backend/services/validation_service.py
# description: Validierung eingehender API Daten inklusive globaler Variablen.
# history:
# - 2026-03-25: Erweitert fuer globale Variablen und neue Node Parameter. author Marcus Schlieper
from typing import Any, Dict, List, Tuple


class ValidationService:
    # Stellt sichere Validierungsfunktionen bereit.

    @staticmethod
    def validate_workflow_payload(payload: Dict[str, Any]) -> Tuple[bool, List[str]]:
        a_errors: List[str] = []

        if not isinstance(payload, dict):
            return False, ["payload_must_be_object"]

        s_name = payload.get("name", "")
        if not isinstance(s_name, str) or not s_name.strip():
            a_errors.append("workflow_name_is_required")

        a_nodes = payload.get("nodes", [])
        a_edges = payload.get("edges", [])
        a_global_variables = payload.get("global_variables", [])

        if not isinstance(a_nodes, list):
            a_errors.append("nodes_must_be_list")

        if not isinstance(a_edges, list):
            a_errors.append("edges_must_be_list")

        if not isinstance(a_global_variables, list):
            a_errors.append("global_variables_must_be_list")

        a_valid_variable_types = ["integer", "float", "string", "array", "object"]

        if isinstance(a_global_variables, list):
            for i_index, o_var in enumerate(a_global_variables):
                if not isinstance(o_var, dict):
                    a_errors.append(f"global_variable_{i_index}_must_be_object")
                    continue
                if o_var.get("s_type") not in a_valid_variable_types:
                    a_errors.append(f"global_variable_{i_index}_invalid_type")

        if isinstance(a_nodes, list):
            for i_index, o_node in enumerate(a_nodes):
                if not isinstance(o_node, dict):
                    a_errors.append(f"node_{i_index}_must_be_object")
                    continue

                if not isinstance(o_node.get("id"), str):
                    a_errors.append(f"node_{i_index}_id_invalid")

                if not isinstance(o_node.get("type"), str):
                    a_errors.append(f"node_{i_index}_type_invalid")

                o_position = o_node.get("position", {})
                if not isinstance(o_position, dict):
                    a_errors.append(f"node_{i_index}_position_invalid")
                else:
                    if not isinstance(o_position.get("x"), (int, float)):
                        a_errors.append(f"node_{i_index}_position_x_invalid")
                    if not isinstance(o_position.get("y"), (int, float)):
                        a_errors.append(f"node_{i_index}_position_y_invalid")

        return len(a_errors) == 0, a_errors
