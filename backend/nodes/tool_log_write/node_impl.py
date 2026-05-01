# file: backend/nodes/tool_log_write/node_impl.py
# description: Node zum sicheren Schreiben von Logeintraegen in eine CSV Datei oder optional in eine Datenbank.
# history:
# - 2026-04-24: Erste Version fuer tool_log_write erstellt. author Marcus Schlieper
# - 2026-04-24: CSV Logging, optionale SQLite Speicherung, Validierung und Fehlerbehandlung ergaenzt. author ChatGPT

import copy
import csv
import json
import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import (
    extract_primary_named_input,
)


class ToolLogWriteNode(BaseNode):
    def get_node_type(self) -> str:
        return "tool_log_write"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "input",
                "s_description": "value to log",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "output",
                "s_description": "log write result",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        
        s_target_type = str(o_data.get("s_target_type", "csv")).strip().lower() or "csv"
        s_log_file_path = str(o_data.get("s_log_file_path", "logfile.csv")).strip() or "logfile.csv"
        s_db_path = str(o_data.get("s_db_path", "logfile.db")).strip() or "logfile.db"
        s_db_table = str(o_data.get("s_db_table", "workflow_logs")).strip() or "workflow_logs"
        s_log_level = str(o_data.get("s_log_level", "info")).strip().lower() or "info"
        s_message = str(o_data.get("s_message", "")).strip()
        s_source = str(o_data.get("s_source", "workflow")).strip() or "workflow"
        s_context_json = str(o_data.get("s_context_json", "")).strip()

        if s_target_type not in ["csv", "sqlite"]:
            raise ValueError("log_target_type_invalid")

        if s_log_level not in ["debug", "info", "warning", "error"]:
            raise ValueError("log_level_invalid")

        o_input_value = extract_primary_named_input(o_context.input_context)
        s_input_text = self._stringify_value(o_input_value)

        if s_message == "":
            s_message = s_input_text

        o_context_object = self._parse_optional_json_object(s_context_json, "log_context_json_invalid")
        s_timestamp = datetime.utcnow().isoformat()

        o_log_record = {
            "timestamp": s_timestamp,
            "level": s_log_level,
            "source": s_source,
            "message": s_message,
            "input_value": s_input_text,
            "context": o_context_object,
        }

        if s_target_type == "csv":
            self._write_csv_log(s_log_file_path, o_log_record)
        else:
            self._write_sqlite_log(s_db_path, s_db_table, o_log_record)

        o_output = {
            "success": True,
            "target_type": s_target_type,
            "log_record": o_log_record,
            "input_used": o_input_value,
            "resolved_data": {
                **o_data,
            },
        }

        return {
            "message": "tool_log_write_ok",
            "output": o_output,
            "value": o_output,
            "output_meta": {
                "output_key": "output_main",
                "output_label": "output",
                "node_outputs": {
                    "output_main": o_output,
                },
            },
        }

    def _write_csv_log(self, s_log_file_path: str, o_log_record: Dict[str, Any]) -> None:
        s_directory = os.path.dirname(s_log_file_path)
        if s_directory != "":
            os.makedirs(s_directory, exist_ok=True)

        b_file_exists = os.path.exists(s_log_file_path)
        a_fieldnames = ["timestamp", "level", "source", "message", "input_value", "context_json"]

        with open(s_log_file_path, "a", newline="", encoding="utf-8") as o_file:
            o_writer = csv.DictWriter(o_file, fieldnames=a_fieldnames)
            if not b_file_exists:
                o_writer.writeheader()

            o_writer.writerow(
                {
                    "timestamp": o_log_record["timestamp"],
                    "level": o_log_record["level"],
                    "source": o_log_record["source"],
                    "message": o_log_record["message"],
                    "input_value": o_log_record["input_value"],
                    "context_json": json.dumps(o_log_record["context"], ensure_ascii=True),
                }
            )

    def _write_sqlite_log(self, s_db_path: str, s_db_table: str, o_log_record: Dict[str, Any]) -> None:
        s_directory = os.path.dirname(s_db_path)
        if s_directory != "":
            os.makedirs(s_directory, exist_ok=True)

        o_connection = None
        try:
            o_connection = sqlite3.connect(s_db_path)
            o_cursor = o_connection.cursor()

            s_safe_table = self._sanitize_table_name(s_db_table)

            o_cursor.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {s_safe_table} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    level TEXT NOT NULL,
                    source TEXT NOT NULL,
                    message TEXT NOT NULL,
                    input_value TEXT NOT NULL,
                    context_json TEXT NOT NULL
                )
                """
            )

            o_cursor.execute(
                f"""
                INSERT INTO {s_safe_table} (
                    timestamp,
                    level,
                    source,
                    message,
                    input_value,
                    context_json
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    o_log_record["timestamp"],
                    o_log_record["level"],
                    o_log_record["source"],
                    o_log_record["message"],
                    o_log_record["input_value"],
                    json.dumps(o_log_record["context"], ensure_ascii=True),
                ),
            )

            o_connection.commit()
        except Exception as o_exc:
            if o_connection is not None:
                o_connection.rollback()
            raise ValueError(f"log_write_failed: {str(o_exc)}")
        finally:
            if o_connection is not None:
                o_connection.close()

    def _sanitize_table_name(self, s_value: str) -> str:
        s_result = "".join(s_char for s_char in s_value if s_char.isalnum() or s_char == "_").strip("_")
        if s_result == "":
            raise ValueError("log_db_table_invalid")
        return s_result

    def _parse_optional_json_object(self, s_value: str, s_error: str) -> Dict[str, Any]:
        if s_value == "":
            return {}
        try:
            o_value = json.loads(s_value)
        except Exception as o_exc:
            raise ValueError(f"{s_error}: {str(o_exc)}")
        if not isinstance(o_value, dict):
            raise ValueError(s_error)
        return o_value

    def _stringify_value(self, o_value: Any) -> str:
        if isinstance(o_value, dict):
            try:
                return json.dumps(o_value, ensure_ascii=True)
            except Exception:
                return str(o_value)
        if isinstance(o_value, list):
            try:
                return json.dumps(o_value, ensure_ascii=True)
            except Exception:
                return str(o_value)
        if o_value is None:
            return ""
        return str(o_value)
