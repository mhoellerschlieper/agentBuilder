# file: backend/nodes/tool_insert_mongodb/node_impl.py
# description: Node fuer das sichere Einfuegen von Daten in eine MongoDB.
# history:
# - 2026-04-24: Erste Version fuer MongoDB Insert erstellt. author Marcus Schlieper
# - 2026-04-24: Mehrfach Insert, Validierung und Fehlerbehandlung ergaenzt. author ChatGPT

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


class ToolInsertMongodbNode(BaseNode):
    def get_node_type(self) -> str:
        return "tool_insert_mongodb"

    def get_default_input_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "input_main",
                "s_label": "input",
                "s_description": "document input",
            }
        ]

    def get_default_output_handles(self) -> List[Dict[str, str]]:
        return [
            {
                "s_key": "output_main",
                "s_label": "output",
                "s_description": "mongodb insert result",
            }
        ]

    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        o_data = copy.deepcopy(o_context.node.get("data", {}))
        
        s_connection_uri = str(o_data.get("s_connection_uri", "")).strip()
        s_database_name = str(o_data.get("s_database_name", "")).strip()
        s_collection_name = str(o_data.get("s_collection_name", "")).strip()
        s_document_json = str(o_data.get("s_document_json", "")).strip()
        s_documents_json = str(o_data.get("s_documents_json", "")).strip()
        i_timeout = int(o_data.get("i_timeout", 10000) or 10000)

        if s_connection_uri == "":
            raise ValueError("mongodb_connection_uri_required")
        if s_database_name == "":
            raise ValueError("mongodb_database_name_required")
        if s_collection_name == "":
            raise ValueError("mongodb_collection_name_required")
        if s_document_json == "" and s_documents_json == "":
            raise ValueError("mongodb_document_required")

        o_client: Optional[MongoClient] = None
        try:
            o_client = MongoClient(s_connection_uri, serverSelectionTimeoutMS=i_timeout)
            o_collection = o_client[s_database_name][s_collection_name]

            if s_documents_json != "":
                a_documents = self._parse_json_array(s_documents_json, "mongodb_documents_json_invalid")
                if len(a_documents) == 0:
                    raise ValueError("mongodb_documents_empty")
                o_result = o_collection.insert_many(a_documents)
                a_inserted_ids = [str(v_value) for v_value in o_result.inserted_ids]
                o_output = {
                    "inserted_count": len(a_inserted_ids),
                    "inserted_ids": a_inserted_ids,
                    "database_name": s_database_name,
                    "collection_name": s_collection_name,
                    "input_used": extract_primary_named_input(o_context.input_context),
                    "resolved_data": {
                        **o_data,
                        "s_connection_uri": "***",
                    },
                }
            else:
                o_document = self._parse_json_object(s_document_json, "mongodb_document_json_invalid")
                o_result = o_collection.insert_one(o_document)
                o_output = {
                    "inserted_count": 1,
                    "inserted_ids": [str(o_result.inserted_id)],
                    "database_name": s_database_name,
                    "collection_name": s_collection_name,
                    "input_used": extract_primary_named_input(o_context.input_context),
                    "resolved_data": {
                        **o_data,
                        "s_connection_uri": "***",
                    },
                }

            return {
                "message": "tool_insert_mongodb_ok",
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
            raise ValueError(f"mongodb_insert_failed: {str(o_exc)}")
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

    def _parse_json_array(self, s_value: str, s_error: str) -> List[Dict[str, Any]]:
        try:
            o_value = json.loads(s_value)
        except Exception as o_exc:
            raise ValueError(f"{s_error}: {str(o_exc)}")
        if not isinstance(o_value, list):
            raise ValueError(s_error)
        for o_item in o_value:
            if not isinstance(o_item, dict):
                raise ValueError(s_error)
        return o_value
