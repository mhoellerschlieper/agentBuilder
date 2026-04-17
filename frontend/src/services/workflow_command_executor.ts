/* file: src/services/workflow_command_executor.ts
description: Fuehrt strukturierte Workflow Commands sicher auf Nodes und Edges aus.
history:
- 2026-03-29: Erstellt fuer Chat to Flow Command Layer. author Marcus Schlieper
- 2026-03-29: Historie ergaenzt fuer sichere Validierung und Summary Ausgabe. author Marcus Schlieper
author Marcus Schlieper
*/
import { MarkerType } from "@xyflow/react";
import { WorkflowCommand, IWorkflowExecutionResult } from "../types/chat_flow";
import { TWorkflowEdge, TWorkflowNode } from "../types/workflow";

function get_default_class_name(s_type: string): string {
  if (s_type.startsWith("tool_")) {
    return "node_tool";
  }
  if (s_type === "start") {
    return "node_start";
  }
  if (s_type === "http") {
    return "node_http";
  }
  if (s_type === "condition") {
    return "node_condition";
  }
  if (s_type === "loop_for") {
    return "node_loop";
  }
  if (s_type === "llm") {
    return "node_llm";
  }
  if (s_type === "group") {
    return "node_group";
  }
  if (s_type === "comment") {
    return "node_comment";
  }
  return "node_end";
}

export function execute_workflow_commands(
  a_nodes: TWorkflowNode[],
  a_edges: TWorkflowEdge[],
  a_commands: WorkflowCommand[]
): IWorkflowExecutionResult {
  const a_next_nodes: TWorkflowNode[] = JSON.parse(JSON.stringify(a_nodes));
  const a_next_edges: TWorkflowEdge[] = JSON.parse(JSON.stringify(a_edges));
  const o_known_node_ids = new Set(a_next_nodes.map((o_node) => o_node.id));
  const o_known_edge_ids = new Set(a_next_edges.map((o_edge) => o_edge.id));

  for (const o_command of a_commands) {
    if (o_command.s_type === "ADD_NODE") {
      if (
        typeof o_command.s_node_id !== "string" ||
        o_command.s_node_id.trim() === "" ||
        o_known_node_ids.has(o_command.s_node_id)
      ) {
        continue;
      }

      a_next_nodes.push({
        id: o_command.s_node_id,
        type: o_command.s_node_type as TWorkflowNode["type"],
        position: o_command.position ?? { x: 0, y: 0 },
        data: {
          s_label: o_command.s_label ?? o_command.s_node_type,
          ...(o_command.data ?? {}),
        } as TWorkflowNode["data"],
        className: get_default_class_name(o_command.s_node_type),
        selected: false,
      });
      o_known_node_ids.add(o_command.s_node_id);
      continue;
    }

    if (o_command.s_type === "ADD_EDGE") {
      if (
        typeof o_command.s_edge_id !== "string" ||
        o_command.s_edge_id.trim() === "" ||
        o_known_edge_ids.has(o_command.s_edge_id)
      ) {
        continue;
      }

      if (
        !o_known_node_ids.has(o_command.s_source) ||
        !o_known_node_ids.has(o_command.s_target)
      ) {
        continue;
      }

      a_next_edges.push({
        id: o_command.s_edge_id,
        source: o_command.s_source,
        target: o_command.s_target,
        type: "custom_edge",
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
      o_known_edge_ids.add(o_command.s_edge_id);
      continue;
    }

    if (o_command.s_type === "UPDATE_NODE_DATA") {
      const i_node_index = a_next_nodes.findIndex(
        (o_node) => o_node.id === o_command.s_node_id
      );
      if (i_node_index < 0) {
        continue;
      }
      a_next_nodes[i_node_index] = {
        ...a_next_nodes[i_node_index],
        data: {
          ...a_next_nodes[i_node_index].data,
          ...o_command.patch,
        },
      };
      continue;
    }

    if (o_command.s_type === "SET_NODE_POSITION") {
      const i_node_index = a_next_nodes.findIndex(
        (o_node) => o_node.id === o_command.s_node_id
      );
      if (i_node_index < 0) {
        continue;
      }
      a_next_nodes[i_node_index] = {
        ...a_next_nodes[i_node_index],
        position: {
          x: Number(o_command.position.x) || 0,
          y: Number(o_command.position.y) || 0,
        },
      };
    }
  }

  return {
    nodes: a_next_nodes,
    edges: a_next_edges,
  };
}

export function extract_intent_summary(a_commands: WorkflowCommand[]): string {
  const i_nodes = a_commands.filter((o_item) => o_item.s_type === "ADD_NODE").length;
  const i_edges = a_commands.filter((o_item) => o_item.s_type === "ADD_EDGE").length;

  return `Workflow erkannt. ${i_nodes} Nodes und ${i_edges} Verbindungen wurden erzeugt.`;
}
