# file: backend/models/workflow_model.py
# description: Datenmodell und Validierung fuer Workflows.
# history:
# - 2026-03-25: Erstellt fuer ersten lauffaehigen Prototyp. author Marcus Schlieper

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class WorkflowNode:
    # Repräsentiert einen Node im Workflow.
    s_id: str
    s_type: str
    d_position_x: float
    d_position_y: float
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowEdge:
    # Repräsentiert eine Verbindung zwischen zwei Nodes.
    s_id: str
    s_source: str
    s_target: str


@dataclass
class WorkflowDefinition:
    # Repräsentiert einen kompletten Workflow.
    s_name: str
    nodes: List[WorkflowNode] = field(default_factory=list)
    edges: List[WorkflowEdge] = field(default_factory=list)
