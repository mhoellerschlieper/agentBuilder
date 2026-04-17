/* file: src/services/workflow_layout.ts
description: Einfaches Auto Layout fuer Chat erzeugte Workflows.
history:
- 2026-03-29: Erstellt fuer geordnete horizontale Anordnung ohne externe Library. author Marcus Schlieper
author Marcus Schlieper
*/
import { TWorkflowEdge, TWorkflowNode } from "../types/workflow";

export function build_auto_layout(
  a_nodes: TWorkflowNode[],
  _a_edges: TWorkflowEdge[]
): { nodes: TWorkflowNode[]; edges: TWorkflowEdge[] } {
  const a_sorted_nodes = [...a_nodes];
  const a_layouted_nodes = a_sorted_nodes.map((o_node, i_index) => ({
    ...o_node,
    position: {
      x: 80 + i_index * 240,
      y: 140,
    },
  }));

  return {
    nodes: a_layouted_nodes,
    edges: _a_edges,
  };
}
