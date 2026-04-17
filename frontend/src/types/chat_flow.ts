/* file: src/types/chat_flow.ts
description: Typen fuer Chat Verlauf und strukturierte Workflow Commands.
history:
- 2026-03-29: Erstellt fuer Chat to Flow MVP. author Marcus Schlieper
author Marcus Schlieper
*/
import { TWorkflowEdge, TWorkflowNode } from "./workflow";

export type TChatRole = "user" | "assistant" | "system";
export type TChatMessageKind = "message" | "summary" | "question";

export interface IChatMessage {
  s_id: string;
  s_role: TChatRole;
  s_content: string;
  s_kind: TChatMessageKind;
  a_commands?: WorkflowCommand[];
}

export type WorkflowCommand =
  | {
      s_type: "ADD_NODE";
      s_node_type: string;
      s_node_id: string;
      s_label?: string;
      position?: { x: number; y: number };
      data?: Record<string, unknown>;
    }
  | {
      s_type: "ADD_EDGE";
      s_edge_id: string;
      s_source: string;
      s_target: string;
    }
  | {
      s_type: "UPDATE_NODE_DATA";
      s_node_id: string;
      patch: Record<string, unknown>;
    }
  | {
      s_type: "SET_NODE_POSITION";
      s_node_id: string;
      position: { x: number; y: number };
    };

export interface IWorkflowExecutionResult {
  nodes: TWorkflowNode[];
  edges: TWorkflowEdge[];
}
