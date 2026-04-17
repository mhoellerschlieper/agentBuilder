# file: backend/services/node_runtime/node_loader.py
# description: Laedt Node Module aus einem Repository und kann Aenderungen zur Laufzeit nachladen.
# history:
# - 2026-04-14: Erste Version mit Repository Hash und dynamischem Reload. author Marcus Schlieper

import hashlib
import importlib
import json
from pathlib import Path
from typing import Any, Dict, List

from services.node_runtime.node_interface import BaseNode


class NodeLoader:
    # Verwaltet das Node Repository und die geladenen Implementierungen.

    def __init__(self) -> None:
        self.s_base_path = Path(__file__).resolve().parent.parent.parent / "nodes"
        self.s_repository_file = self.s_base_path / "node_repository.json"
        self.s_repository_hash = ""
        self.d_node_instances: Dict[str, BaseNode] = {}
        self.d_repository_data: Dict[str, Any] = {}
        self.reload_if_repository_changed(force_reload=True)

    def reload_if_repository_changed(self, force_reload: bool = False) -> None:
        s_current_hash = self._calculate_repository_hash()
        if not force_reload and s_current_hash == self.s_repository_hash:
            return

        d_repository = self._load_repository_definition()
        d_instances: Dict[str, BaseNode] = {}

        a_nodes = d_repository.get("nodes", [])
        if not isinstance(a_nodes, list):
            raise ValueError("node_repository_nodes_invalid")

        for o_node_entry in a_nodes:
            self._validate_repository_entry(o_node_entry)

            s_node_type = str(o_node_entry.get("s_node_type", "")).strip()
            s_module_path = str(o_node_entry.get("s_module_path", "")).strip()
            s_class_name = str(o_node_entry.get("s_class_name", "")).strip()

            o_module = importlib.import_module(s_module_path)
            importlib.reload(o_module)

            o_class = getattr(o_module, s_class_name, None)
            if o_class is None:
                raise ValueError(f"node_class_not_found:{s_node_type}")

            o_instance = o_class()
            if not isinstance(o_instance, BaseNode):
                raise ValueError(f"node_class_invalid:{s_node_type}")

            if o_instance.get_node_type() != s_node_type:
                raise ValueError(f"node_type_mismatch:{s_node_type}")

            d_instances[s_node_type] = o_instance

        self.d_node_instances = d_instances
        self.d_repository_data = d_repository
        self.s_repository_hash = s_current_hash

    def execute_node(self, s_node_type: str, o_context) -> Dict[str, Any]:
        if s_node_type not in self.d_node_instances:
            raise ValueError(f"node_type_not_registered:{s_node_type}")

        o_node = self.d_node_instances[s_node_type]
        return o_node.execute(o_context)

    def get_default_input_handles_for_node_type(self, s_node_type: str) -> List[Dict[str, str]]:
        o_node = self.d_node_instances.get(s_node_type)
        if o_node is None:
            return [{"s_key": "input_main", "s_label": "input", "s_description": "main input"}]
        return o_node.get_default_input_handles()

    def get_default_output_handles_for_node_type(self, s_node_type: str) -> List[Dict[str, str]]:
        o_node = self.d_node_instances.get(s_node_type)
        if o_node is None:
            return [{"s_key": "output_main", "s_label": "result", "s_description": "main output"}]
        return o_node.get_default_output_handles()

    def _calculate_repository_hash(self) -> str:
        if not self.s_repository_file.exists():
            raise ValueError("node_repository_missing")

        s_content = self.s_repository_file.read_text(encoding="utf-8")
        return hashlib.sha256(s_content.encode("utf-8")).hexdigest()

    def _load_repository_definition(self) -> Dict[str, Any]:
        if not self.s_repository_file.exists():
            raise ValueError("node_repository_missing")

        with open(self.s_repository_file, "r", encoding="utf-8") as o_file:
            o_data = json.load(o_file)

        if not isinstance(o_data, dict):
            raise ValueError("node_repository_invalid")

        return o_data

    def _validate_repository_entry(self, o_node_entry: Any) -> None:
        if not isinstance(o_node_entry, dict):
            raise ValueError("node_repository_entry_invalid")

        a_required_keys = [
            "s_node_type",
            "s_module_path",
            "s_class_name",
            "s_version",
            "b_enabled",
        ]

        for s_key in a_required_keys:
            if s_key not in o_node_entry:
                raise ValueError(f"node_repository_entry_missing:{s_key}")

        if not bool(o_node_entry.get("b_enabled", False)):
            raise ValueError(f"node_repository_entry_disabled:{o_node_entry.get('s_node_type', 'unknown')}")
