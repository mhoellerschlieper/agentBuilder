/* file: frontend/src/types/workflow.ts
description: Gemeinsame Typen fuer Workflow, Templates, Kommentare, Canvas Einstellungen und Auswahl.
history:
- 2026-03-25: Erweitert fuer globale Variablen und Node Daten. author Marcus Schlieper
- 2026-03-27: Erweitert fuer Templates und Import aus JSON Vorlagen. author Marcus Schlieper
- 2026-03-28: Erweitert fuer dynamische Tool Nodes. author Marcus Schlieper
- 2026-04-03: Erweitert fuer Switch Node mit Cases und Default Ausgang. author Marcus Schlieper
- 2026-04-03: Erweitert fuer Code Node mit Python Eingaben, Ausgaben und Code Feld. author Marcus Schlieper
- 2026-04-12: Classifier Node Daten und Node Type ergaenzt. author Marcus Schlieper
*/
import { Edge, Node } from "@xyflow/react";
import { IToolNodeData } from "./tool_registry";

export type TNodeType =
  | "start"
  | "http"
  | "condition"
  | "switch"
  | "code"
  | "loop_for"
  | "llm"
  | "classifier"
  | "group"
  | "end"
  | "comment"
  | `tool_${string}`;

export type TVariableType =
  | "integer"
  | "float"
  | "string"
  | "array"
  | "object";

export interface IGlobalVariable {
  s_id: string;
  s_name: string;
  s_type: TVariableType;
  value: unknown;
}

export interface IRuleItem {
  s_id: string;
  s_if_left: string;
  s_operator: string;
  s_if_right: string;
  s_then: string;
  s_else: string;
}

export interface ISwitchCaseItem {
  s_id: string;
  s_value: string;
}

export interface IClassifierClassItem {
  s_id: string;
  s_label: string;
  s_description: string;
}

export interface IStartInputItem {
  s_id: string;
  s_name: string;
  s_type: TVariableType;
  s_bind_variable: string;
}

export interface IEndOutputItem {
  s_id: string;
  s_name: string;
  s_type: TVariableType;
  s_bind_variable: string;
}

export interface ICodeInputItem {
  s_id: string;
  s_name: string;
  s_type: TVariableType;
  s_bind_variable: string;
}

export interface ICodeOutputItem {
  s_id: string;
  s_name: string;
  s_type: TVariableType;
  s_bind_variable: string;
}

export interface IHttpHeaderItem {
  s_id: string;
  s_key: string;
  s_value: string;
}

export interface IHttpParamItem {
  s_id: string;
  s_key: string;
  s_value: string;
}

export interface INodeDataBase {
  s_label: string;
}

export interface IStartNodeData extends INodeDataBase {
  inputs: IStartInputItem[];
  s_query: string;
  b_enable: boolean;
  s_array_obj_variable: string;
}

export interface IHttpNodeData extends INodeDataBase {
  s_api: string;
  s_method: string;
  headers: IHttpHeaderItem[];
  params: IHttpParamItem[];
  s_body: string;
  i_timeout: number;
  i_retry_times: number;
  s_result_body_variable: string;
  s_result_headers_variable: string;
  s_result_status_code_variable: string;
}

export interface IConditionNodeData extends INodeDataBase {
  rules: IRuleItem[];
}

export interface ISwitchNodeData extends INodeDataBase {
  s_if_left: string;
  cases: ISwitchCaseItem[];
  s_default: string;
}

export interface IClassifierNodeData {
  s_label?: string;
  s_provider?: "openai" | "endpoint" | string;
  s_model_name?: string;
  d_temperature?: number;
  s_system_prompt?: string;
  s_prompt?: string;
  classes?: IClassifierClassItem[];
  input_handles?: {
    s_key?: string;
    s_label?: string;
    s_description?: string;
  }[];
  output_handles?: {
    s_key?: string;
    s_label?: string;
    s_description?: string;
  }[];
  result?: unknown;
  runtime_result?: unknown;
  o_result?: unknown;
  s_runtime_status?: string;
}

export interface ICodeNodeData extends INodeDataBase {
  inputs: ICodeInputItem[];
  outputs: ICodeOutputItem[];
  s_python_code: string;
}

export interface ILoopForNodeData extends INodeDataBase {
  s_source_array_variable: string;
  s_item_variable: string;
  s_index_variable: string;
}

/* file: frontend/src/types/workflow.ts
 * description: Patch fuer LLM Node Typdefinition mit Provider Feld.
 * history:
 * - 2026-04-08: s_provider fuer LLM Node Daten ergaenzt. author Marcus Schlieper
 * author Marcus Schlieper
 */
export interface ILlmNodeData {
  s_label?: string;
  s_model_name?: string;
  s_api_key?: string;
  s_api_host?: string;
  s_provider?: "openai" | "endpoint" | string;
  d_temperature?: number;
  s_system_prompt?: string;
  s_prompt?: string;
  s_result_variable?: string;
  i_timeout?: number;
  input_handles?: {
    s_key?: string;
    s_label?: string;
    s_description?: string;
  }[];
  output_handles?: {
    s_key?: string;
    s_label?: string;
    s_description?: string;
  }[];
  b_show_on_begin?: boolean;
  b_show_on_change?: boolean;
  b_show_on_end?: boolean;
  b_show_on_error?: boolean;
  b_show_use_tool?: boolean;
  b_show_use_memory?: boolean;
  result?: unknown;
  runtime_result?: unknown;
  o_result?: unknown;
  s_runtime_status?: string;
}

export interface IGroupNodeData extends INodeDataBase {
  s_group_name: string;
  child_node_ids: string[];
}

export interface IEndNodeData extends INodeDataBase {
  outputs: IEndOutputItem[];
  b_success: boolean;
  s_query: string;
}

export interface ICommentNodeData extends INodeDataBase {
  s_text: string;
  s_color: string;
}

export type TWorkflowNodeData =
  | IStartNodeData
  | IHttpNodeData
  | IConditionNodeData
  | ISwitchNodeData
  | IClassifierNodeData
  | ICodeNodeData
  | ILoopForNodeData
  | ILlmNodeData
  | IGroupNodeData
  | IEndNodeData
  | ICommentNodeData
  | IToolNodeData;

export type TWorkflowNode = Node;
export type TWorkflowEdge = Edge;

export interface ICanvasSettings {
  b_show_grid: boolean;
  b_snap_to_grid: boolean;
  b_lock_canvas: boolean;
  i_snap_grid_x: number;
  i_snap_grid_y: number;
}

export interface IWorkflowDefinition {
  s_name: string;
  nodes: TWorkflowNode[];
  edges: TWorkflowEdge[];
  global_variables: IGlobalVariable[];
  canvas_settings: ICanvasSettings;
}

export interface IClipboardPayload {
  nodes: TWorkflowNode[];
  edges: TWorkflowEdge[];
}

export interface IWorkflowTemplate {
  s_id: string;
  s_name: string;
  s_description: string;
  workflow: IWorkflowDefinition;
}
