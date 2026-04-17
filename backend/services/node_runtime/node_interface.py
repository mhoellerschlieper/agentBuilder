# file: backend/services/node_runtime/node_interface.py
# description: Basis Interface fuer alle dynamisch ladbaren Nodes.
# history:
# - 2026-04-14: Erste Version. author Marcus Schlieper

from abc import ABC, abstractmethod
from typing import Any, Dict, List

from services.node_runtime.node_execution_context import NodeExecutionContext


class BaseNode(ABC):
    # Gemeinsames Interface fuer alle Nodes.

    @abstractmethod
    def get_node_type(self) -> str:
        pass

    @abstractmethod
    def get_default_input_handles(self) -> List[Dict[str, str]]:
        pass

    @abstractmethod
    def get_default_output_handles(self) -> List[Dict[str, str]]:
        pass

    @abstractmethod
    def execute(self, o_context: NodeExecutionContext) -> Dict[str, Any]:
        pass
