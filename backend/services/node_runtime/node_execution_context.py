# file: backend/services/node_runtime/node_execution_context.py
# description: Kontext Objekt fuer ausgelagerte Node Implementierungen.
# history:
# - 2026-04-14: Erste Version fuer dynamische Node Ausfuehrung. author Marcus Schlieper

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class NodeExecutionContext:
    # Uebergibt alle benoetigten Informationen an eine Node Implementierung.
    node: Dict[str, Any]
    node_item: Dict[str, Any]
    input_context: Dict[str, Any]
