# file: backend/nodes/tool_delete_mongodb/node_impl.py
# description: Node fuer das sichere Loeschen von Daten aus einer MongoDB.
# history:
# - 2026-04-24: Erste Version fuer MongoDB Delete erstellt. author Marcus Schlieper
# - 2026-04-24: Delete Many, Validierung und Fehlerbehandlung ergaenzt. author ChatGPT

import copy
import json
from typing import Any, Dict, List, Optional

from pymongo import MongoClient
from pymongo.errors import PyMongoError

from services.node_runtime.node_execution_context import NodeExecutionContext
from services.node_runtime.node_interface import BaseNode
from services.node_runtime.node_utils import (
    extract_primary_named_input,
)


class ToolDeleteMongodbNode(BaseNode):
    def get_node_type(self) -> str:
        return "tool_delete_mongodb"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "input",
                "s_description": "delete input",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "output",
                "s_description": "mongodb delete result",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        
        s_connection_uri = str(o_data.get("s_connection_uri", "")).strip()
        s_database_name = str(o_data.get("s_database_name", "")).strip()
        s_collection_name = str(o_data.get("s_collection_name", "")).strip()
        s_filter_json = str(o_data.get("s_filter_json", "")).strip()
        b_delete_many = bool(o_data.get("b_delete_many", False))
        i_timeout = int(o_data.get("i_timeout", 10000) or 10000)

        if s_connection_uri == "":
            raise ValueError("mongodb_connection_uri_required")
        if s_database_name == "":
            raise ValueError("mongodb_database_name_required")
        if s_collection_name == "":
            raise ValueError("mongodb_collection_name_required")
        if s_filter_json == "":
            raise ValueError("mongodb_filter_required")

        o_filter = self._parse_json_object(s_filter_json, "mongodb_filter_json_invalid")

        o_client: Optional[MongoClient] = None
        try:
            o_client = MongoClient(s_connection_uri, serverSelectionTimeoutMS=i_timeout)
            o_collection = o_client[s_database_name][s_collection_name]

            if b_delete_many:
                o_result = o_collection.delete_many(o_filter)
            else:
                o_result = o_collection.delete_one(o_filter)

            o_output = {
                "deleted_count": int(o_result.deleted_count),
                "database_name": s_database_name,
                "collection_name": s_collection_name,
                "filter_used": o_filter,
                "delete_many": b_delete_many,
                "input_used": extract_primary_named_input(o_context.input_context),
                "resolved_data": {
                    **o_data,
                    "s_connection_uri": "***",
                },
            }

            return {
                "message": "tool_delete_mongodb_ok",
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
        except PyMongoError as o_exc:
            raise ValueError(f"mongodb_delete_failed: {str(o_exc)}")
        finally:
            if o_client is not None:
                o_client.close()

    def _parse_json_object(self, s_value: str, s_error: str) -> Dict[str, Any]:
        try:
            o_value = json.loads(s_value)
        except Exception as o_exc:
            raise ValueError(f"{s_error}: {str(o_exc)}")
        if not isinstance(o_value, dict):
            raise ValueError(s_error)
        return o_value
