# file: backend/nodes/tool_read_mongodb/node_impl.py
# description: Node fuer das sichere Lesen von Daten aus einer MongoDB.
# history:
# - 2026-04-24: Erste Version fuer MongoDB Read erstellt. author Marcus Schlieper
# - 2026-04-24: Validierung, Fehlerbehandlung und sichere Defaults ergaenzt. author ChatGPT

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


class ToolReadMongodbNode(BaseNode):
    def get_node_type(self) -> str:
        return "tool_read_mongodb"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "input",
                "s_description": "optional input data",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "output",
                "s_description": "mongodb read result",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        
        s_connection_uri = str(o_data.get("s_connection_uri", "")).strip()
        s_database_name = str(o_data.get("s_database_name", "")).strip()
        s_collection_name = str(o_data.get("s_collection_name", "")).strip()
        s_filter_json = str(o_data.get("s_filter_json", "{}")).strip() or "{}"
        s_projection_json = str(o_data.get("s_projection_json", "")).strip()
        s_sort_json = str(o_data.get("s_sort_json", "")).strip()
        i_limit = int(o_data.get("i_limit", 100) or 100)
        i_timeout = int(o_data.get("i_timeout", 10000) or 10000)

        if s_connection_uri == "":
            raise ValueError("mongodb_connection_uri_required")
        if s_database_name == "":
            raise ValueError("mongodb_database_name_required")
        if s_collection_name == "":
            raise ValueError("mongodb_collection_name_required")
        if i_limit < 1:
            raise ValueError("mongodb_limit_invalid")

        o_filter = self._parse_json_object(s_filter_json, "mongodb_filter_json_invalid")
        o_projection = self._parse_optional_json_object(
            s_projection_json, "mongodb_projection_json_invalid"
        )
        a_sort = self._parse_optional_sort_json(s_sort_json)

        o_client: Optional[MongoClient] = None
        try:
            o_client = MongoClient(s_connection_uri, serverSelectionTimeoutMS=i_timeout)
            o_collection = o_client[s_database_name][s_collection_name]

            o_cursor = o_collection.find(o_filter, o_projection)
            if len(a_sort) > 0:
                o_cursor = o_cursor.sort(a_sort)
            o_cursor = o_cursor.limit(i_limit)

            a_documents = []
            for o_item in o_cursor:
                a_documents.append(self._make_json_safe(o_item))

            o_output = {
                "records": a_documents,
                "record_count": len(a_documents),
                "database_name": s_database_name,
                "collection_name": s_collection_name,
                "filter_used": o_filter,
                "projection_used": o_projection,
                "sort_used": a_sort,
                "limit_used": i_limit,
                "input_used": extract_primary_named_input(o_context.input_context),
                "resolved_data": {
                    **o_data,
                    "s_connection_uri": "***",
                },
            }

            return {
                "message": "tool_read_mongodb_ok",
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
            raise ValueError(f"mongodb_read_failed: {str(o_exc)}")
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

    def _parse_optional_json_object(
        self,
        s_value: str,
        s_error: str,
    ) -> Optional[Dict[str, Any]]:
        if s_value == "":
            return None
        return self._parse_json_object(s_value, s_error)

    def _parse_optional_sort_json(self, s_value: str) -> List[Any]:
        if s_value == "":
            return []
        try:
            o_value = json.loads(s_value)
        except Exception as o_exc:
            raise ValueError(f"mongodb_sort_json_invalid: {str(o_exc)}")
        if not isinstance(o_value, list):
            raise ValueError("mongodb_sort_json_invalid")
        return o_value

    def _make_json_safe(self, o_value: Any) -> Any:
        try:
            json.dumps(o_value)
            return o_value
        except Exception:
            if isinstance(o_value, dict):
                return {
                    str(s_key): self._make_json_safe(v_value)
                    for s_key, v_value in o_value.items()
                }
            if isinstance(o_value, list):
                return [self._make_json_safe(v_value) for v_value in o_value]
            return str(o_value)
