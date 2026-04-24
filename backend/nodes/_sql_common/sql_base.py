# file: backend/nodes/_sql_common/sql_base.py
# description: Gemeinsame SQL Hilfsklassen fuer MySQL, MSSQL und ODBC Nodes.
# history:
# - 2026-04-24: Erste gemeinsame SQL Basis erstellt. author Marcus Schlieper
# - 2026-04-24: Sichere Query Pruefung, Historie und gemeinsame Hilfsfunktionen ergaenzt. author ChatGPT

import copy
import json
from typing import Any, Dict, List, Optional, Tuple

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import (
    extract_primary_named_input,
    replace_input_placeholders,
)


class SqlNodeBase(BaseNode):
    # history:
    # - 2026-04-24: Gemeinsame SQL Execute Hilfen hinzugefuegt. author ChatGPT

    def _resolve_data(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        return replace_input_placeholders(o_data, o_context.input_context)

    def _parse_params_json(self, s_value: str) -> List[Any]:
        s_clean = str(s_value).strip()
        if s_clean == "":
            return []
        try:
            o_value = json.loads(s_clean)
        except Exception as o_exc:
            raise ValueError(f"sql_params_json_invalid: {str(o_exc)}")
        if not isinstance(o_value, list):
            raise ValueError("sql_params_json_invalid")
        return o_value

    def _normalize_rows(self, a_rows: List[Any]) -> List[Any]:
        a_result = []
        for o_row in a_rows:
            if isinstance(o_row, dict):
                a_result.append({str(s_key): self._make_json_safe(v_value) for s_key, v_value in o_row.items()})
            elif isinstance(o_row, (list, tuple)):
                a_result.append([self._make_json_safe(v_value) for v_value in o_row])
            else:
                a_result.append(self._make_json_safe(o_row))
        return a_result

    def _make_json_safe(self, o_value: Any) -> Any:
        try:
            json.dumps(o_value)
            return o_value
        except Exception:
            if isinstance(o_value, dict):
                return {str(s_key): self._make_json_safe(v_value) for s_key, v_value in o_value.items()}
            if isinstance(o_value, (list, tuple)):
                return [self._make_json_safe(v_value) for v_value in o_value]
            return str(o_value)

    def _validate_read_query(self, s_query: str) -> None:
        s_clean = s_query.strip().lower()
        if s_clean == "":
            raise ValueError("sql_query_required")
        if not s_clean.startswith("select"):
            raise ValueError("sql_read_query_must_start_with_select")
        if ";" in s_clean[:-1]:
            raise ValueError("sql_multiple_statements_not_allowed")

    def _validate_write_query(self, s_query: str, s_expected_prefix: str) -> None:
        s_clean = s_query.strip().lower()
        if s_clean == "":
            raise ValueError("sql_query_required")
        if not s_clean.startswith(s_expected_prefix):
            raise ValueError(f"sql_query_must_start_with_{s_expected_prefix}")
        if ";" in s_clean[:-1]:
            raise ValueError("sql_multiple_statements_not_allowed")

    def _build_output(
        self,
        s_message: str,
        o_output: Dict[str, Any],
    ) -> Dict[str, Any]:
        return {
            "message": s_message,
            "output": o_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "output",
                "node_outputs": {
                    "output_main": o_output,
                },
            },
        }

    def _mask_sensitive_fields(self, o_data: Dict[str, Any]) -> Dict[str, Any]:
        o_result = copy.deepcopy(o_data)
        for s_key in ["s_password", "s_connection_string"]:
            if str(o_result.get(s_key, "")).strip() != "":
                o_result[s_key] = "***"
        return o_result

    def _get_common_input_used(self, o_context: NodeExecutionContext) -> Any:
        return extract_primary_named_input(o_context.input_context)
