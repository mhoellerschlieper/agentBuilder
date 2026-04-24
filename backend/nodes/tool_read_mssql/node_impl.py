# file: backend/nodes/tool_read_mssql/node_impl.py
# description: Node fuer das sichere Lesen von Daten aus einer MSSQL Datenbank.
# history:
# - 2026-04-24: Erste Version fuer MSSQL Read erstellt. author Marcus Schlieper
# - 2026-04-24: Sichere Query Pruefung und ODBC basierte Verbindung ergaenzt. author ChatGPT

from typing import Any, Dict, List

import pyodbc

from nodes._sql_common.sql_base import SqlNodeBase
from services.node_runtime.node_execution_context import NodeExecutionContext


class ToolReadMssqlNode(SqlNodeBase):
    def get_node_type(self) -> str:
        return "tool_read_mssql"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "input_main", "s_label": "input", "s_description": "optional input"}]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "output_main", "s_label": "output", "s_description": "mssql read result"}]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = self._resolve_data(o_context)

        s_connection_string = str(o_data.get("s_connection_string", "")).strip()
        s_query = str(o_data.get("s_query", "")).strip()
        s_params_json = str(o_data.get("s_params_json", "[]")).strip() or "[]"
        i_timeout = int(o_data.get("i_timeout", 10) or 10)

        if s_connection_string == "":
            raise ValueError("mssql_connection_string_required")

        self._validate_read_query(s_query)
        a_params = self._parse_params_json(s_params_json)

        o_connection = None
        try:
            o_connection = pyodbc.connect(s_connection_string, timeout=i_timeout)
            o_cursor = o_connection.cursor()
            o_cursor.execute(s_query, a_params)

            a_columns = [o_column[0] for o_column in o_cursor.description]
            a_rows = []
            for o_row in o_cursor.fetchall():
                o_item = {}
                for i_index, s_column_name in enumerate(a_columns):
                    o_item[s_column_name] = self._make_json_safe(o_row[i_index])
                a_rows.append(o_item)

            o_output = {
                "rows": a_rows,
                "row_count": len(a_rows),
                "query_used": s_query,
                "params_used": a_params,
                "input_used": self._get_common_input_used(o_context),
                "resolved_data": self._mask_sensitive_fields(o_data),
            }
            return self._build_output("tool_read_mssql_ok", o_output)
        except Exception as o_exc:
            raise ValueError(f"mssql_read_failed: {str(o_exc)}")
        finally:
            if o_connection is not None:
                o_connection.close()
