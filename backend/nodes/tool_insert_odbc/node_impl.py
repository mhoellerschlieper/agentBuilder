# file: backend/nodes/tool_insert_odbc/node_impl.py
# description: Node fuer das sichere Einfuegen von Daten ueber eine ODBC Verbindung.
# history:
# - 2026-04-24: Erste Version fuer ODBC Insert erstellt. author Marcus Schlieper
# - 2026-04-24: Commit Rollback und Parameter Support ergaenzt. author ChatGPT

from typing import Any, Dict, List

import pyodbc

from nodes._sql_common.sql_base import SqlNodeBase
from services.node_runtime.node_execution_context import NodeExecutionContext


class ToolInsertOdbcNode(SqlNodeBase):
    def get_node_type(self) -> str:
        return "tool_insert_odbc"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "input_main", "s_label": "input", "s_description": "insert input"}]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "output_main", "s_label": "output", "s_description": "odbc insert result"}]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = self._resolve_data(o_context)

        s_connection_string = str(o_data.get("s_connection_string", "")).strip()
        s_query = str(o_data.get("s_query", "")).strip()
        s_params_json = str(o_data.get("s_params_json", "[]")).strip() or "[]"
        i_timeout = int(o_data.get("i_timeout", 10) or 10)

        if s_connection_string == "":
            raise ValueError("odbc_connection_string_required")

        self._validate_write_query(s_query, "insert")
        a_params = self._parse_params_json(s_params_json)

        o_connection = None
        try:
            o_connection = pyodbc.connect(s_connection_string, timeout=i_timeout)
            o_cursor = o_connection.cursor()
            o_cursor.execute(s_query, a_params)
            o_connection.commit()

            o_output = {
                "affected_rows": int(o_cursor.rowcount),
                "query_used": s_query,
                "params_used": a_params,
                "input_used": self._get_common_input_used(o_context),
                "resolved_data": self._mask_sensitive_fields(o_data),
            }
            return self._build_output("tool_insert_odbc_ok", o_output)
        except Exception as o_exc:
            if o_connection is not None:
                o_connection.rollback()
            raise ValueError(f"odbc_insert_failed: {str(o_exc)}")
        finally:
            if o_connection is not None:
                o_connection.close()
