/* file: src/store/workflow_store.tsx
description: Zentrales State Management mit Tool Node Unterstuetzung aus JSON Registry.
history:
- 2026-03-27: Erweitert fuer Template Auswahl und Laden auf Canvas. author Marcus Schlieper
- 2026-03-28: Erweitert fuer dynamische Tool Nodes. author Marcus Schlieper
- 2026-03-29: Chat Verlauf und direkte Workflow Uebernahme fuer Chat to Flow MVP ergaenzt. author Marcus Schlieper
- 2026-04-03: Switch Node und Code Node Default Daten sowie Klassen ergaenzt. author Marcus Schlieper
- 2026-04-12: Default Werte fuer aufklappbare Node Details und Switch Case Handles ergaenzt. author Marcus Schlieper
- 2026-04-12: Classifier Node Default Daten und Klassen Handles ergaenzt. author Marcus Schlieper
*/
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  EdgeChange,
  MarkerType,
  NodeChange,
} from "@xyflow/react";
import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ICanvasSettings,
  IClipboardPayload,
  IClassifierNodeData,
  ICodeNodeData,
  ICommentNodeData,
  IConditionNodeData,
  IEndNodeData,
  IShowNodeData,
  IGlobalVariable,
  IHttpNodeData,
  ILoopForNodeData,
  ILlmNodeData,
  IRuleItem,
  IStartNodeData,
  ISwitchNodeData,
  IWorkflowDefinition,
  TNodeType,
  TWorkflowEdge,
  TWorkflowNode,
  TWorkflowNodeData,
  TVariableType,
} from "../types/workflow";
import { build_tool_node_data, IToolNodeSchema } from "../types/tool_registry";
import { IChatMessage } from "../types/chat_flow";

interface IWorkflowSnapshot {
  s_workflow_name: string;
  nodes: TWorkflowNode[];
  edges: TWorkflowEdge[];
  global_variables: IGlobalVariable[];
  canvas_settings: ICanvasSettings;
  a_selected_node_ids: string[];
  chat_messages: IChatMessage[];
}

interface IContextMenuState {
  b_open: boolean;
  x: number;
  y: number;
}

interface IWorkflowStoreContext {
  s_workflow_name: string;
  nodes: TWorkflowNode[];
  edges: TWorkflowEdge[];
  global_variables: IGlobalVariable[];
  canvas_settings: ICanvasSettings;
  s_selected_node_id: string | null;
  a_selected_node_ids: string[];
  o_context_menu: IContextMenuState;
  chat_messages: IChatMessage[];
  set_workflow_name: (s_name: string) => void;
  on_nodes_change: (changes: NodeChange[]) => void;
  on_edges_change: (changes: EdgeChange[]) => void;
  on_connect: (connection: Connection) => void;
  add_node: (s_type: TNodeType, o_tool_schema?: IToolNodeSchema) => void;
  load_workflow_definition: (o_workflow: IWorkflowDefinition) => void;
  apply_workflow_definition: (o_workflow: IWorkflowDefinition) => void;
  delete_node: (s_node_id: string) => void;
  delete_selected_nodes: () => void;
  delete_edge: (s_edge_id: string) => void;
  insert_node_on_edge: (
    s_edge_id: string,
    s_type: TNodeType,
    o_tool_schema?: IToolNodeSchema
  ) => void;
  select_node: (s_node_id: string | null, b_multi?: boolean) => void;
  set_selected_node_ids: (a_ids: string[]) => void;
  clear_selection: () => void;
  update_node_data: (
    s_node_id: string,
    o_patch: Partial<TWorkflowNodeData>
  ) => void;
  add_global_variable: (s_type: TVariableType) => void;
  update_global_variable: (
    s_id: string,
    o_patch: Partial<IGlobalVariable>
  ) => void;
  remove_global_variable: (s_id: string) => void;
  get_selected_node: () => TWorkflowNode | undefined;
  export_workflow: () => string;
  import_workflow: (s_json: string) => { success: boolean; error?: string };
  undo: () => void;
  redo: () => void;
  can_undo: boolean;
  can_redo: boolean;
  toggle_show_grid: () => void;
  toggle_snap_to_grid: () => void;
  toggle_lock_canvas: () => void;
  copy_selected_to_json: () => string;
  copy_all_to_json: () => string;
  cut_selected_to_json: () => string;
  paste_from_json: (s_json: string) => { success: boolean; error?: string };
  open_context_menu: (x: number, y: number) => void;
  close_context_menu: () => void;
  add_chat_message: (o_message: IChatMessage) => void;
  clear_chat_messages: () => void;
}

const WorkflowStoreContext = createContext<IWorkflowStoreContext | undefined>(
  undefined
);

function create_id(s_prefix: string): string {
  return `${s_prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function clone_snapshot(o_snapshot: IWorkflowSnapshot): IWorkflowSnapshot {
  return JSON.parse(JSON.stringify(o_snapshot)) as IWorkflowSnapshot;
}

function get_default_canvas_settings(): ICanvasSettings {
  return {
    b_show_grid: true,
    b_snap_to_grid: true,
    b_lock_canvas: false,
    i_snap_grid_x: 20,
    i_snap_grid_y: 20,
  };
}

function get_default_rule(): IRuleItem {
  return {
    s_id: create_id("rule"),
    s_if_left: "",
    s_operator: "equals",
    s_if_right: "",
    s_then: "",
    s_else: "",
  };
}

function get_default_switch_case(): {
  s_id: string;
  s_value: string;
} {
  return {
    s_id: create_id("switch_case"),
    s_value: "",
  };
}

function get_default_switch_output_handles(): Array<{
  s_key: string;
  s_label: string;
  s_description: string;
}> {
  return [
    {
      s_key: "case_1",
      s_label: "case_1",
      s_description: "Ausgang fuer case_1",
    },
    {
      s_key: "default",
      s_label: "default",
      s_description: "Standard Ausgang",
    },
    {
      s_key: "output_main",
      s_label: "Ergebnis",
      s_description: "Standard Ergebnis",
    },
  ];
}

function get_default_classifier_output_handles(): Array<{
  s_key: string;
  s_label: string;
  s_description: string;
}> {
  return [
    {
      s_key: "class_1",
      s_label: "class_1",
      s_description: "Ausgang fuer Klasse class_1",
    },
    {
      s_key: "default",
      s_label: "default",
      s_description: "Fallback Ausgang",
    },
    {
      s_key: "output_main",
      s_label: "Ergebnis",
      s_description: "Classifier Ergebnis",
    },
  ];
}

function get_default_classifier_classes(): Array<{
  s_id: string;
  s_label: string;
  s_description: string;
}> {
  return [
    {
      s_id: create_id("classifier_class"),
      s_label: "",
      s_description: "",
    },
  ];
}

function get_default_node_data(
  s_type: TNodeType,
  o_tool_schema?: IToolNodeSchema
): TWorkflowNodeData {
  if (s_type.startsWith("tool_")) {
    if (!o_tool_schema) {
      return {
        s_label: s_type,
        s_tool_type: s_type,
        s_schema_version: "1",
        b_details_open: false,
        b_runtime_result_open: false,
      } as TWorkflowNodeData;
    }
    return {
      ...build_tool_node_data(o_tool_schema),
      b_details_open: false,
      b_runtime_result_open: false,
    } as TWorkflowNodeData;
  }

  if (s_type === "start") {
    const o_data: IStartNodeData = {
      s_label: "Start",
      inputs: [],
      s_query: "",
      b_enable: true,
      s_array_obj_variable: "",
      b_details_open: false,
      b_runtime_result_open: false,
    } as IStartNodeData;
    return o_data;
  }

  if (s_type === "http") {
    const o_data: IHttpNodeData = {
      s_label: "HTTP",
      s_api: "",
      s_method: "GET",
      headers: [],
      params: [],
      s_body: "",
      i_timeout: 10000,
      i_retry_times: 0,
      s_result_body_variable: "",
      s_result_headers_variable: "",
      s_result_status_code_variable: "",
      b_details_open: false,
      b_runtime_result_open: false,
    } as IHttpNodeData;
    return o_data;
  }

  if (s_type === "condition") {
    const o_data: IConditionNodeData = {
      s_label: "Condition",
      rules: [get_default_rule()],
      b_details_open: false,
      b_runtime_result_open: false,
    } as IConditionNodeData;
    return o_data;
  }

  if (s_type === "switch") {
    const o_data: ISwitchNodeData = {
      s_label: "Switch",
      s_if_left: "",
      cases: [get_default_switch_case()],
      s_default: "default",
      output_handles: get_default_switch_output_handles(),
      b_details_open: false,
      b_runtime_result_open: false,
    } as ISwitchNodeData;
    return o_data;
  }

  if (s_type === "code") {
    const o_data: ICodeNodeData = {
      s_label: "Python-Code",
      inputs: [],
      outputs: [],
      s_python_code: "",
      b_details_open: false,
      b_runtime_result_open: false,
    } as ICodeNodeData;
    return o_data;
  }

  if (s_type === "loop_for") {
    const o_data: ILoopForNodeData = {
      s_label: "Loop For",
      s_source_array_variable: "",
      s_item_variable: "",
      s_index_variable: "",
      b_details_open: false,
      b_runtime_result_open: false,
    } as ILoopForNodeData;
    return o_data;
  }

  if (s_type === "llm") {
    const o_data: ILlmNodeData = {
      s_label: "LLM",
      s_model_name: "gpt-4o-mini",
      s_api_key: "",
      s_api_host: "",
      d_temperature: 0.2,
      s_system_prompt: "",
      s_prompt: "",
      s_result_variable: "",
      b_details_open: false,
      b_runtime_result_open: false,
    } as ILlmNodeData;
    return o_data;
  }

  if (s_type === "classifier") {
    const o_data: IClassifierNodeData = {
      s_label: "Classifier",
      s_provider: "openai",
      s_model_name: "gpt-4o-mini",
      d_temperature: 0,
      s_system_prompt: "",
      s_prompt: "",
      classes: get_default_classifier_classes(),
      input_handles: [
        {
          s_key: "input_main",
          s_label: "Eingabe",
          s_description: "Text oder Daten fuer Klassifikation",
        },
      ],
      output_handles: get_default_classifier_output_handles(),
      b_details_open: false,
      b_runtime_result_open: false,
    } as IClassifierNodeData;
    return o_data;
  }

  if (s_type === "group") {
    return {
      s_label: "Group",
      s_group_name: "Group",
      child_node_ids: [],
      b_details_open: false,
      b_runtime_result_open: false,
    } as TWorkflowNodeData;
  }

  if (s_type === "comment") {
    const o_data: ICommentNodeData = {
      s_label: "Comment",
      s_text: "Kommentar",
      s_color: "#fef3c7",
      b_details_open: false,
      b_runtime_result_open: false,
    } as ICommentNodeData;
    return o_data;
  }

  if (s_type === "show") {
    const o_data: IShowNodeData = {
      s_label: "Show",
      outputs: [],
      b_success: true,
      s_query: "",
      b_details_open: false,
      b_runtime_result_open: false,
    } as IShowNodeData;
    return o_data;
  }

  const o_data: IEndNodeData = {
    s_label: "End",
    outputs: [],
    b_success: true,
    s_query: "",
    b_details_open: false,
    b_runtime_result_open: false,
  } as IEndNodeData;
  return o_data;
}

function get_node_class_name(s_type: TNodeType): string {
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
  if (s_type === "switch") {
    return "node_switch";
  }
  if (s_type === "code") {
    return "node_code";
  }
  if (s_type === "loop_for") {
    return "node_loop";
  }
  if (s_type === "llm") {
    return "node_llm";
  }
  if (s_type === "classifier") {
    return "node_classifier";
  }
  if (s_type === "group") {
    return "node_group";
  }
  if (s_type === "comment") {
    return "node_comment";
  }
  return "node_end";
}

function create_node(
  s_type: TNodeType,
  i_index: number,
  o_tool_schema?: IToolNodeSchema
): TWorkflowNode {
  return {
    id: create_id("node"),
    type: s_type,
    position: {
      x: 120 + i_index * 30,
      y: 120 + i_index * 30,
    },
    data: get_default_node_data(s_type, o_tool_schema),
    className: get_node_class_name(s_type),
    selected: false,
  };
}

function sanitize_clipboard_payload(o_data: unknown): IClipboardPayload | null {
  if (!o_data || typeof o_data !== "object") {
    return null;
  }
  const o_map = o_data as Record<string, unknown>;
  if (!Array.isArray(o_map.nodes) || !Array.isArray(o_map.edges)) {
    return null;
  }
  return {
    nodes: o_map.nodes as TWorkflowNode[],
    edges: o_map.edges as TWorkflowEdge[],
  };
}

export function WorkflowProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [s_workflow_name, set_workflow_name_state] =
    useState<string>("demo_workflow");
  const [nodes, set_nodes] = useState<TWorkflowNode[]>([]);
  const [edges, set_edges] = useState<TWorkflowEdge[]>([]);
  const [global_variables, set_global_variables] = useState<IGlobalVariable[]>(
    []
  );
  const [canvas_settings, set_canvas_settings] = useState<ICanvasSettings>(
    get_default_canvas_settings()
  );
  const [s_selected_node_id, set_selected_node_id] = useState<string | null>(
    null
  );
  const [a_selected_node_ids, set_selected_node_ids_state] = useState<string[]>(
    []
  );
  const [undo_stack, set_undo_stack] = useState<IWorkflowSnapshot[]>([]);
  const [redo_stack, set_redo_stack] = useState<IWorkflowSnapshot[]>([]);
  const [o_context_menu, set_context_menu] = useState<IContextMenuState>({
    b_open: false,
    x: 0,
    y: 0,
  });
  const [chat_messages, set_chat_messages] = useState<IChatMessage[]>([]);
  const b_is_restoring_ref = useRef<boolean>(false);

  function get_current_snapshot(): IWorkflowSnapshot {
    return {
      s_workflow_name,
      nodes,
      edges,
      global_variables,
      canvas_settings,
      a_selected_node_ids,
      chat_messages,
    };
  }

  function push_history(): void {
    if (b_is_restoring_ref.current) {
      return;
    }
    set_undo_stack((a_prev) => [
      ...a_prev,
      clone_snapshot(get_current_snapshot()),
    ]);
    set_redo_stack([]);
  }

  function restore_snapshot(o_snapshot: IWorkflowSnapshot): void {
    b_is_restoring_ref.current = true;
    set_workflow_name_state(o_snapshot.s_workflow_name);
    set_nodes(o_snapshot.nodes);
    set_edges(o_snapshot.edges);
    set_global_variables(o_snapshot.global_variables);
    set_canvas_settings(o_snapshot.canvas_settings);
    set_selected_node_id(o_snapshot.a_selected_node_ids[0] ?? null);
    set_selected_node_ids_state(o_snapshot.a_selected_node_ids);
    set_chat_messages(o_snapshot.chat_messages ?? []);
    setTimeout(() => {
      b_is_restoring_ref.current = false;
    }, 0);
  }

  function sync_selected_flags(
    a_ids: string[],
    a_nodes: TWorkflowNode[]
  ): TWorkflowNode[] {
    return a_nodes.map((o_node) => ({
      ...o_node,
      selected: a_ids.includes(o_node.id),
    }));
  }

  function set_workflow_name(s_name: string): void {
    push_history();
    set_workflow_name_state(s_name);
  }

  function on_nodes_change(changes: NodeChange[]): void {
    if (changes.length > 0) {
      push_history();
    }
    set_nodes((a_prev) => {
      const a_next = applyNodeChanges(changes, a_prev) as TWorkflowNode[];
      const a_selected = a_next
        .filter((o_node) => o_node.selected)
        .map((o_node) => o_node.id);
      set_selected_node_ids_state(a_selected);
      set_selected_node_id(a_selected[0] ?? null);
      return a_next;
    });
  }

  function on_edges_change(changes: EdgeChange[]): void {
    if (changes.length > 0) {
      push_history();
    }
    set_edges((a_prev) => applyEdgeChanges(changes, a_prev) as TWorkflowEdge[]);
  }

  function on_connect(connection: Connection): void {
    if (!connection.source || !connection.target) {
      return;
    }
    push_history();
    set_edges(
      (a_prev) =>
        addEdge(
          {
            ...connection,
            id: create_id("edge"),
            type: "custom_edge",
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          },
          a_prev
        ) as TWorkflowEdge[]
    );
  }

  function add_node(s_type: TNodeType, o_tool_schema?: IToolNodeSchema): void {
    push_history();
    set_nodes((a_prev) => {
      const o_node = create_node(s_type, a_prev.length + 1, o_tool_schema);
      return [...a_prev, o_node];
    });
  }

  function load_workflow_definition(o_workflow: IWorkflowDefinition): void {
    push_history();
    set_workflow_name_state(o_workflow.s_name);
    set_nodes(
      (o_workflow.nodes || []).map((o_node) => ({
        ...o_node,
        selected: false,
      }))
    );
    set_edges(o_workflow.edges || []);
    set_global_variables(o_workflow.global_variables || []);
    set_canvas_settings(
      o_workflow.canvas_settings || get_default_canvas_settings()
    );
    set_selected_node_id(null);
    set_selected_node_ids_state([]);
    close_context_menu();
  }

  function apply_workflow_definition(o_workflow: IWorkflowDefinition): void {
    push_history();
    set_workflow_name_state(o_workflow.s_name);
    set_nodes(
      (o_workflow.nodes || []).map((o_node) => ({
        ...o_node,
        selected: false,
      }))
    );
    set_edges(o_workflow.edges || []);
    set_global_variables(o_workflow.global_variables || global_variables);
    set_canvas_settings(
      o_workflow.canvas_settings || get_default_canvas_settings()
    );
    set_selected_node_id(null);
    set_selected_node_ids_state([]);
    close_context_menu();
  }

  function delete_node(s_node_id: string): void {
    push_history();
    set_nodes((a_prev) => a_prev.filter((o_node) => o_node.id !== s_node_id));
    set_edges((a_prev) =>
      a_prev.filter(
        (o_edge) => o_edge.source !== s_node_id && o_edge.target !== s_node_id
      )
    );
    set_selected_node_ids_state((a_prev) =>
      a_prev.filter((s_id) => s_id !== s_node_id)
    );
    set_selected_node_id((s_prev) => (s_prev === s_node_id ? null : s_prev));
  }

  function delete_selected_nodes(): void {
    if (a_selected_node_ids.length === 0) {
      return;
    }
    push_history();
    const o_selected_set = new Set(a_selected_node_ids);
    set_nodes((a_prev) =>
      a_prev.filter((o_node) => !o_selected_set.has(o_node.id))
    );
    set_edges((a_prev) =>
      a_prev.filter(
        (o_edge) =>
          !o_selected_set.has(String(o_edge.source)) &&
          !o_selected_set.has(String(o_edge.target))
      )
    );
    set_selected_node_ids_state([]);
    set_selected_node_id(null);
  }

  function delete_edge(s_edge_id: string): void {
    push_history();
    set_edges((a_prev) => a_prev.filter((o_edge) => o_edge.id !== s_edge_id));
  }

  function insert_node_on_edge(
    s_edge_id: string,
    s_type: TNodeType,
    o_tool_schema?: IToolNodeSchema
  ): void {
    const o_edge = edges.find((o_item) => o_item.id === s_edge_id);
    if (!o_edge || !o_edge.source || !o_edge.target) {
      return;
    }

    push_history();

    const o_source_node = nodes.find((o_item) => o_item.id === o_edge.source);
    const o_target_node = nodes.find((o_item) => o_item.id === o_edge.target);

    const d_source_x = o_source_node?.position.x ?? 0;
    const d_source_y = o_source_node?.position.y ?? 0;
    const d_target_x = o_target_node?.position.x ?? d_source_x + 240;
    const d_target_y = o_target_node?.position.y ?? d_source_y;

    const o_new_node: TWorkflowNode = {
      ...create_node(s_type, nodes.length + 1, o_tool_schema),
      position: {
        x: (d_source_x + d_target_x) / 2,
        y: (d_source_y + d_target_y) / 2,
      },
    };

    const o_first_edge: TWorkflowEdge = {
      id: create_id("edge"),
      source: String(o_edge.source),
      target: o_new_node.id,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      type: "custom_edge",
    };

    const o_second_edge: TWorkflowEdge = {
      id: create_id("edge"),
      source: o_new_node.id,
      target: String(o_edge.target),
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      type: "custom_edge",
    };

    set_nodes((a_prev) =>
      sync_selected_flags([o_new_node.id], [...a_prev, o_new_node])
    );
    set_edges((a_prev) => {
      const a_without_old = a_prev.filter((o_item) => o_item.id !== s_edge_id);
      return [...a_without_old, o_first_edge, o_second_edge];
    });
    set_selected_node_ids_state([o_new_node.id]);
    set_selected_node_id(o_new_node.id);
  }

  function select_node(s_node_id: string | null, b_multi = false): void {
    if (!s_node_id) {
      clear_selection();
      return;
    }

    if (b_multi) {
      set_selected_node_ids_state((a_prev) => {
        const b_exists = a_prev.includes(s_node_id);
        const a_next = b_exists
          ? a_prev.filter((s_id) => s_id !== s_node_id)
          : [...a_prev, s_node_id];
        set_selected_node_id(a_next[0] ?? null);
        set_nodes((a_prev_nodes) => sync_selected_flags(a_next, a_prev_nodes));
        return a_next;
      });
      return;
    }

    set_selected_node_id(s_node_id);
    set_selected_node_ids_state([s_node_id]);
    set_nodes((a_prev) => sync_selected_flags([s_node_id], a_prev));
  }

  function set_selected_node_ids(a_ids: string[]): void {
    set_selected_node_ids_state(a_ids);
    set_selected_node_id(a_ids[0] ?? null);
    set_nodes((a_prev) => sync_selected_flags(a_ids, a_prev));
  }

  function clear_selection(): void {
    set_selected_node_id(null);
    set_selected_node_ids_state([]);
    set_nodes((a_prev) => sync_selected_flags([], a_prev));
  }

  function update_node_data(
    s_node_id: string,
    o_patch: Partial<TWorkflowNodeData>
  ): void {
    push_history();
    set_nodes((a_prev) =>
      a_prev.map((o_node) => {
        if (o_node.id !== s_node_id) {
          return o_node;
        }
        return {
          ...o_node,
          data: {
            ...o_node.data,
            ...o_patch,
          } as TWorkflowNodeData,
        };
      })
    );
  }

  function add_global_variable(s_type: TVariableType): void {
    push_history();
    const o_default_value_map: Record<TVariableType, unknown> = {
      integer: 0,
      float: 0.0,
      string: "",
      array: [],
      object: {},
    };
    const o_variable: IGlobalVariable = {
      s_id: create_id("var"),
      s_name: `${s_type}_variable_${global_variables.length + 1}`,
      s_type,
      value: o_default_value_map[s_type],
    };
    set_global_variables((a_prev) => [...a_prev, o_variable]);
  }

  function update_global_variable(
    s_id: string,
    o_patch: Partial<IGlobalVariable>
  ): void {
    push_history();
    set_global_variables((a_prev) =>
      a_prev.map((o_item) => {
        if (o_item.s_id !== s_id) {
          return o_item;
        }
        return {
          ...o_item,
          ...o_patch,
        };
      })
    );
  }

  function remove_global_variable(s_id: string): void {
    push_history();
    set_global_variables((a_prev) =>
      a_prev.filter((o_item) => o_item.s_id !== s_id)
    );
  }

  function get_selected_node(): TWorkflowNode | undefined {
    return nodes.find((o_node) => o_node.id === s_selected_node_id);
  }

  function export_workflow(): string {
    const o_export = {
      s_name: s_workflow_name,
      nodes,
      edges,
      global_variables,
      canvas_settings,
      chat_messages,
    };
    return JSON.stringify(o_export, null, 2);
  }

  function import_workflow(s_json: string): {
    success: boolean;
    error?: string;
  } {
    try {
      const o_data = JSON.parse(s_json) as Record<string, unknown>;
      if (!o_data || typeof o_data !== "object") {
        return { success: false, error: "invalid_import_payload" };
      }
      if (
        !Array.isArray(o_data.nodes) ||
        !Array.isArray(o_data.edges) ||
        !Array.isArray(o_data.global_variables)
      ) {
        return { success: false, error: "invalid_import_structure" };
      }

      push_history();
      set_workflow_name_state(
        typeof o_data.s_name === "string" ? o_data.s_name : "imported_workflow"
      );
      set_nodes(
        (o_data.nodes as TWorkflowNode[]).map((o_node) => ({
          ...o_node,
          selected: false,
        }))
      );
      set_edges(o_data.edges as TWorkflowEdge[]);
      set_global_variables(o_data.global_variables as IGlobalVariable[]);
      set_canvas_settings(
        o_data.canvas_settings
          ? (o_data.canvas_settings as ICanvasSettings)
          : get_default_canvas_settings()
      );
      set_chat_messages(
        Array.isArray(o_data.chat_messages)
          ? (o_data.chat_messages as IChatMessage[])
          : []
      );
      set_selected_node_id(null);
      set_selected_node_ids_state([]);
      return { success: true };
    } catch (_o_error) {
      return { success: false, error: "invalid_json" };
    }
  }

  function undo(): void {
    if (undo_stack.length === 0) {
      return;
    }
    const o_current = clone_snapshot(get_current_snapshot());
    const o_previous = undo_stack[undo_stack.length - 1];
    const a_next_undo = undo_stack.slice(0, -1);
    set_undo_stack(a_next_undo);
    set_redo_stack((a_prev) => [...a_prev, o_current]);
    restore_snapshot(o_previous);
  }

  function redo(): void {
    if (redo_stack.length === 0) {
      return;
    }
    const o_current = clone_snapshot(get_current_snapshot());
    const o_next = redo_stack[redo_stack.length - 1];
    const a_next_redo = redo_stack.slice(0, -1);
    set_redo_stack(a_next_redo);
    set_undo_stack((a_prev) => [...a_prev, o_current]);
    restore_snapshot(o_next);
  }

  function toggle_show_grid(): void {
    push_history();
    set_canvas_settings((o_prev) => ({
      ...o_prev,
      b_show_grid: !o_prev.b_show_grid,
    }));
  }

  function toggle_snap_to_grid(): void {
    push_history();
    set_canvas_settings((o_prev) => ({
      ...o_prev,
      b_snap_to_grid: !o_prev.b_snap_to_grid,
    }));
  }

  function toggle_lock_canvas(): void {
    push_history();
    set_canvas_settings((o_prev) => ({
      ...o_prev,
      b_lock_canvas: !o_prev.b_lock_canvas,
    }));
  }

  function build_clipboard_from_node_ids(
    a_node_ids: string[]
  ): IClipboardPayload {
    const o_selected_set = new Set(a_node_ids);
    const a_nodes = nodes
      .filter((o_node) => o_selected_set.has(o_node.id))
      .map((o_node) => JSON.parse(JSON.stringify(o_node)) as TWorkflowNode);
    const a_edges = edges
      .filter(
        (o_edge) =>
          o_selected_set.has(String(o_edge.source)) &&
          o_selected_set.has(String(o_edge.target))
      )
      .map((o_edge) => JSON.parse(JSON.stringify(o_edge)) as TWorkflowEdge);

    return {
      nodes: a_nodes,
      edges: a_edges,
    };
  }

  function copy_selected_to_json(): string {
    return JSON.stringify(
      build_clipboard_from_node_ids(a_selected_node_ids),
      null,
      2
    );
  }

  function copy_all_to_json(): string {
    return JSON.stringify(
      build_clipboard_from_node_ids(nodes.map((o_node) => o_node.id)),
      null,
      2
    );
  }

  function cut_selected_to_json(): string {
    const s_json = copy_selected_to_json();
    delete_selected_nodes();
    return s_json;
  }

  function paste_from_json(s_json: string): {
    success: boolean;
    error?: string;
  } {
    try {
      const o_raw = JSON.parse(s_json) as unknown;
      const o_payload = sanitize_clipboard_payload(o_raw);
      if (!o_payload) {
        return { success: false, error: "invalid_clipboard_payload" };
      }

      push_history();

      const o_id_map = new Map<string, string>();

      const a_new_nodes: TWorkflowNode[] = o_payload.nodes.map(
        (o_node, i_index) => {
          const s_new_id = create_id("node");
          o_id_map.set(o_node.id, s_new_id);
          return {
            ...o_node,
            id: s_new_id,
            position: {
              x: Number(o_node.position?.x ?? 0) + 40 + i_index * 10,
              y: Number(o_node.position?.y ?? 0) + 40 + i_index * 10,
            },
            selected: true,
          };
        }
      );

      const a_new_edges: TWorkflowEdge[] = o_payload.edges
        .map((o_edge) => {
          const s_new_source = o_id_map.get(String(o_edge.source));
          const s_new_target = o_id_map.get(String(o_edge.target));
          if (!s_new_source || !s_new_target) {
            return null;
          }
          return {
            ...o_edge,
            id: create_id("edge"),
            source: s_new_source,
            target: s_new_target,
            type: "custom_edge",
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          } as TWorkflowEdge;
        })
        .filter((o_item): o_item is TWorkflowEdge => Boolean(o_item));

      const a_new_ids = a_new_nodes.map((o_node) => o_node.id);

      set_nodes((a_prev) =>
        sync_selected_flags(a_new_ids, [...a_prev, ...a_new_nodes])
      );
      set_edges((a_prev) => [...a_prev, ...a_new_edges]);
      set_selected_node_ids_state(a_new_ids);
      set_selected_node_id(a_new_ids[0] ?? null);

      return { success: true };
    } catch (_o_error) {
      return { success: false, error: "invalid_json" };
    }
  }

  function open_context_menu(x: number, y: number): void {
    set_context_menu({
      b_open: true,
      x,
      y,
    });
  }

  function close_context_menu(): void {
    set_context_menu({
      b_open: false,
      x: 0,
      y: 0,
    });
  }

  function add_chat_message(o_message: IChatMessage): void {
    set_chat_messages((a_prev) => [...a_prev, o_message]);
  }

  function clear_chat_messages(): void {
    set_chat_messages([]);
  }

  const o_value = useMemo(
    (): IWorkflowStoreContext => ({
      s_workflow_name,
      nodes,
      edges,
      global_variables,
      canvas_settings,
      s_selected_node_id,
      a_selected_node_ids,
      o_context_menu,
      chat_messages,
      set_workflow_name,
      on_nodes_change,
      on_edges_change,
      on_connect,
      add_node,
      load_workflow_definition,
      apply_workflow_definition,
      delete_node,
      delete_selected_nodes,
      delete_edge,
      insert_node_on_edge,
      select_node,
      set_selected_node_ids,
      clear_selection,
      update_node_data,
      add_global_variable,
      update_global_variable,
      remove_global_variable,
      get_selected_node,
      export_workflow,
      import_workflow,
      undo,
      redo,
      can_undo: undo_stack.length > 0,
      can_redo: redo_stack.length > 0,
      toggle_show_grid,
      toggle_snap_to_grid,
      toggle_lock_canvas,
      copy_selected_to_json,
      copy_all_to_json,
      cut_selected_to_json,
      paste_from_json,
      open_context_menu,
      close_context_menu,
      add_chat_message,
      clear_chat_messages,
    }),
    [
      s_workflow_name,
      nodes,
      edges,
      global_variables,
      canvas_settings,
      s_selected_node_id,
      a_selected_node_ids,
      o_context_menu,
      undo_stack,
      redo_stack,
      chat_messages,
    ]
  );

  return (
    <WorkflowStoreContext.Provider value={o_value}>
      {children}
    </WorkflowStoreContext.Provider>
  );
}

export function use_workflow_store(): IWorkflowStoreContext {
  const o_context = useContext(WorkflowStoreContext);
  if (!o_context) {
    throw new Error("workflow_store_context_missing");
  }
  return o_context;
}
