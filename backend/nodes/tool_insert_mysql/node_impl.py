# file: backend/nodes/tool_insert_mysql/node_impl.py
# description: Node fuer das sichere Einfuegen von Daten in eine MySQL Datenbank.
# history:
# - 2026-04-24: Erste Version fuer MySQL Insert erstellt. author Marcus Schlieper
# - 2026-04-24: Parameter Support und Commit Rollback Logik ergaenzt. author ChatGPT

from typing import Any, Dict, List

import pymysql

from nodes._sql_common.sql_base import SqlNodeBase
from services.node_runtime.node_execution_context import NodeExecutionContext


class ToolInsertMysqlNode(SqlNodeBase):
    def get_node_type(self) -> str:
        return "tool_insert_mysql"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "input_main", "s_label": "input", "s_description": "insert input"}]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [{"s_key": "output_main", "s_label": "output", "s_description": "mysql insert result"}]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = self._resolve_data(o_context)

        s_host = str(o_data.get("s_host", "")).strip()
        i_port = int(o_data.get("i_port", 3306) or 3306)
        s_database_name = str(o_data.get("s_database_name", "")).strip()
        s_username = str(o_data.get("s_username", "")).strip()
        s_password = str(o_data.get("s_password", "")).strip()
        s_query = str(o_data.get("s_query", "")).strip()
        s_params_json = str(o_data.get("s_params_json", "[]")).strip() or "[]"
        i_timeout = int(o_data.get("i_timeout", 10) or 10)

        if s_host == "":
            raise ValueError("mysql_host_required")
        if s_database_name == "":
            raise ValueError("mysql_database_required")
        if s_username == "":
            raise ValueError("mysql_username_required")

        self._validate_write_query(s_query, "insert")
        a_params = self._parse_params_json(s_params_json)

        o_connection = None
        try:
            o_connection = pymysql.connect(
                host=s_host,
                port=i_port,
                user=s_username,
                password=s_password,
                database=s_database_name,
                connect_timeout=i_timeout,
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=False,
            )
            with o_connection.cursor() as o_cursor:
                o_cursor.execute(s_query, a_params)
                o_connection.commit()
                i_row_count = int(o_cursor.rowcount)
                i_lastrowid = int(o_cursor.lastrowid or 0)

            o_output = {
                "affected_rows": i_row_count,
                "last_insert_id": i_lastrowid,
                "database_name": s_database_name,
                "query_used": s_query,
                "params_used": a_params,
                "input_used": self._get_common_input_used(o_context),
                "resolved_data": self._mask_sensitive_fields(o_data),
            }
            return self._build_output("tool_insert_mysql_ok", o_output)
        except Exception as o_exc:
            if o_connection is not None:
                o_connection.rollback()
            raise ValueError(f"mysql_insert_failed: {str(o_exc)}")
        finally:
            if o_connection is not None:
                o_connection.close()
