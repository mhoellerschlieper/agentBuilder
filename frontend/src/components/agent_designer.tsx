/* file: frontend/src/components/agent_designer.tsx
description: Agent designer with file actions, workflow naming, save, save as, and rename support.
history:
- 2026-03-25: Initial visual workflow editor created. author Marcus Schlieper
- 2026-03-29: Tool registry node types added. author Marcus Schlieper
- 2026-04-03: Toolbar and file actions extended. author Marcus Schlieper
- 2026-04-04: Workflow start, backend runner hook and live status colors added. author Marcus Schlieper
- 2026-04-07: Runtime node results stored in frontend. author Marcus Schlieper
- 2026-04-11: Hover menus stabilized, workspace scrollable and chat panel safely embedded. author Marcus Schlieper
- 2026-04-12: Helper lines corrected to start from dragged node and only show on real alignment matches. author Marcus Schlieper
- 2026-04-12: Runtime data for input and output handle displays extended. author Marcus Schlieper
- 2026-04-13: Workflow finished handling hardened with fallback via runner result. author Marcus Schlieper
- 2026-04-22: Save as, overwrite save, new workflow naming, and inline workflow rename added. author Marcus Schlieper
author Marcus Schlieper
*/

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  FiActivity,
  FiCheck,
  FiClipboard,
  FiCopy,
  FiCrosshair,
  FiDownload,
  FiEdit3,
  FiFilePlus,
  FiFolder,
  FiGrid,
  FiHardDrive,
  FiLayers,
  FiLayout,
  FiMaximize2,
  FiMessageSquare,
  FiMoon,
  FiPlay,
  FiRefreshCw,
  FiRotateCcw,
  FiRotateCw,
  FiSave,
  FiScissors,
  FiSettings,
  FiSidebar,
  FiSkipForward,
  FiSliders,
  FiSquare,
  FiSun,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { ChatPanel } from "./chat_panel";
import { CanvasContextMenu } from "./canvas_context_menu";
import { CustomEdge } from "./custom_edge";
import {
  RightSidebarTabs,
  type TRightSidebarTabsHandle,
} from "./right_sidebar_tabs";
import { CommentNode } from "./nodes/comment_node";
import { ConditionNode } from "./nodes/condition_node";
import { SwitchNode } from "./nodes/switch_node";
import { CodeNode } from "./nodes/code_node";
import { EndNode } from "./nodes/end_node";
import { GroupNode } from "./nodes/group_node";
import { HttpNode } from "./nodes/http_node";
import { LlmNode } from "./nodes/llm_node";
import { ClassifierNode } from "./nodes/classifier_node";
import { LoopForNode } from "./nodes/loop_for_node";
import { StartNode } from "./nodes/start_node";
import { ToolNode } from "./nodes/tool_node";
import { use_workflow_store } from "../store/workflow_store";
import { use_tool_registry_store } from "../store/tool_registry_store";
import { parse_chat_to_commands } from "../services/intent_parser";
import {
  execute_workflow_commands,
  extract_intent_summary,
} from "../services/workflow_command_executor";
import { build_auto_layout } from "../services/workflow_layout";
import { get_socket } from "../services/socket";
import { RunnerPanel, type TRunnerPanelHandle, type TRunWorkflowResult } from "./runner_panel";

type TRecord = Record<string, unknown>;

type TNodeBox = {
  d_left: number;
  d_top: number;
  d_width: number;
  d_height: number;
  d_center_x: number;
  d_center_y: number;
  d_right: number;
  d_bottom: number;
};

type THelperLineSegment = {
  d_left: number;
  d_top: number;
  d_width: number;
  d_height: number;
};

type THelperLines = {
  o_vertical_left?: THelperLineSegment;
  o_vertical_center?: THelperLineSegment;
  o_vertical_right?: THelperLineSegment;
  o_horizontal_top?: THelperLineSegment;
  o_horizontal_center?: THelperLineSegment;
  o_horizontal_bottom?: THelperLineSegment;
};

type TToolbarActionButtonProps = {
  s_title: string;
  s_label: string;
  Icon: IconType;
  on_click: () => void | Promise<void>;
  b_active?: boolean;
  b_disabled?: boolean;
  s_icon_color?: string;
};

type TMenuGroup = {
  s_group_id: string;
  s_group_label: string;
  Icon: IconType;
  a_actions: TToolbarActionButtonProps[];
};

type TWorkspacePanel = {
  s_panel_id: string;
  s_label: string;
  Icon: IconType;
};

type THoverMenuGroupProps = {
  o_group: TMenuGroup;
  b_right?: boolean;
};

type TWorkflowRunState =
  | "idle"
  | "starting"
  | "running"
  | "finished"
  | "error"
  | "stopped";

type TNodeExecutionStatus = "idle" | "running" | "success" | "error";

type TWorkflowStatusPayload = {
  status?: string;
  workflow_name?: string;
  node_id?: string;
  error?: string;
  success?: boolean;
  done?: boolean;
  completed?: boolean;
  is_finished?: boolean;
  result?: unknown;
  results?: TRunNodeResult[];
};

type TNodeStatusPayload = {
  node_id?: string;
  node_type?: string;
  status?: string;
  result?: unknown;
  error?: string;
};

type TRunNodeResult = {
  node_id?: string;
  status?: string;
  result?: unknown;
  error?: string;
};


type TWorkflowStoreShape = {
  s_workflow_name: string;
  nodes: Node[];
  edges: any[];
  canvas_settings: {
    b_show_grid: boolean;
    b_snap_to_grid: boolean;
    b_lock_canvas: boolean;
    i_snap_grid_x: number;
    i_snap_grid_y: number;
  };
  s_selected_node_id?: string;
  a_selected_node_ids: string[];
  on_nodes_change: (a_changes: any[]) => void;
  on_edges_change: (a_changes: any[]) => void;
  on_connect: (o_connection: any) => void;
  clear_selection: () => void;
  select_node: (s_node_id: string, b_additive?: boolean) => void;
  add_chat_message: (o_message: any) => void;
  apply_workflow_definition: (o_definition: {
    s_name: string;
    nodes: Node[];
    edges: any[];
    global_variables: unknown[];
    canvas_settings: any;
  }) => void;
  copy_selected_to_json: () => string;
  copy_all_to_json: () => string;
  cut_selected_to_json: () => string;
  paste_from_json: (s_json: string) => void;
  delete_selected_nodes: () => void;
  open_context_menu: (d_x: number, d_y: number) => void;
  undo?: () => void;
  redo?: () => void;
  update_canvas_settings?: (o_patch: TRecord) => void;
  select_all_nodes?: () => void;
  a_chat_messages?: unknown[];
};

const o_base_node_types: NodeTypes = {
  start: StartNode,
  http: HttpNode,
  condition: ConditionNode,
  switch: SwitchNode,
  code: CodeNode,
  loop_for: LoopForNode,
  llm: LlmNode,
  end: EndNode,
  comment: CommentNode,
  group: GroupNode,
  tool_node: ToolNode,
  classifier: ClassifierNode,
};

const o_edge_types = {
  custom_edge: CustomEdge,
};

const d_alignment_tolerance_px = 6;

function get_shell_style(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "92px 1fr 92px",
    width: "100%",
    height: "100vh",
    background: "var(--color_app_bg)",
    color: "var(--color_text)",
    overflow: "hidden",
  };
}

function get_side_rail_style(b_right: boolean = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "14px 10px",
    background: "var(--color_panel)",
    borderRight: b_right ? "none" : "1px solid var(--color_border)",
    borderLeft: b_right ? "1px solid var(--color_border)" : "none",
    overflow: "visible",
    position: "relative",
    zIndex: 40,
  };
}

function get_center_panel_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    minHeight: 0,
    background: "var(--color_canvas_bg)",
  };
}

function get_brand_style(): React.CSSProperties {
  return {
    padding: "6px 4px 12px 4px",
    borderBottom: "1px solid var(--color_border)",
    marginBottom: "4px",
  };
}

function get_brand_title_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "14px",
    fontWeight: 800,
    color: "var(--color_text)",
  };
}

function get_brand_text_style(): React.CSSProperties {
  return {
    margin: "4px 0 0 0",
    fontSize: "11px",
    lineHeight: 1.3,
    color: "var(--color_text_muted)",
  };
}

function get_group_container_style(): React.CSSProperties {
  return {
    position: "relative",
    paddingRight: "14px",
    paddingLeft: "14px",
    marginRight: "-14px",
    marginLeft: "-14px",
  };
}

function get_group_button_style(
  b_active: boolean = false
): React.CSSProperties {
  return {
    width: "100%",
    minHeight: "70px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    border: b_active
      ? "1px solid var(--color_accent)"
      : "1px solid var(--color_border)",
    borderRadius: "16px",
    background: b_active
      ? "var(--color_accent_soft)"
      : "var(--color_panel_elevated)",
    color: b_active ? "var(--color_accent_text)" : "var(--color_text)",
    cursor: "pointer",
    transition: "all 0.18s ease",
    padding: "10px 8px",
  };
}

function get_group_button_icon_style(): React.CSSProperties {
  return {
    fontSize: "18px",
    flexShrink: 0,
  };
}

function get_group_button_label_style(): React.CSSProperties {
  return {
    fontSize: "11px",
    fontWeight: 700,
    textAlign: "center",
    lineHeight: 1.15,
  };
}

function get_flyout_style_left(b_right: boolean = false): React.CSSProperties {
  return {
    position: "absolute",
    top: 0,
    left: b_right ? "auto" : "calc(100% - 4px)",
    right: b_right ? "calc(100% - 4px)" : "auto",
    minWidth: "220px",
    maxWidth: "420px",
    padding: "12px",
    border: "1px solid var(--color_border)",
    borderRadius: "18px",
    background: "var(--color_panel)",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.18)",
    zIndex: 60,
  };
}

function get_flyout_style_right(b_right: boolean = true): React.CSSProperties {
  return {
    position: "absolute",
    top: 0,
    left: b_right ? "auto" : "calc(100% - 4px)",
    right: b_right ? "calc(100% - 4px)" : "auto",
    minWidth: "420px",
    maxWidth: "420px",
    padding: "12px",
    border: "1px solid var(--color_border)",
    borderRadius: "18px",
    background: "var(--color_panel)",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.18)",
    zIndex: 60,
  };
}

function get_flyout_title_style(): React.CSSProperties {
  return {
    margin: "0 0 10px 0",
    fontSize: "13px",
    fontWeight: 800,
    color: "var(--color_text)",
  };
}

function get_action_list_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };
}

function get_workspace_panel_body_style(): React.CSSProperties {
  return {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: "2px",
  };
}

function get_toolbar_action_button_style(
  b_active: boolean = false,
  b_disabled: boolean = false
): React.CSSProperties {
  return {
    width: "100%",
    minHeight: "48px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: b_active
      ? "1px solid var(--color_accent)"
      : "1px solid var(--color_border)",
    background: b_active
      ? "var(--color_accent_soft)"
      : "var(--color_panel_elevated)",
    color: b_disabled
      ? "var(--color_text_muted)"
      : b_active
      ? "var(--color_accent_text)"
      : "var(--color_text)",
    borderRadius: "12px",
    cursor: b_disabled ? "not-allowed" : "pointer",
    opacity: b_disabled ? 0.55 : 1,
    transition: "all 0.16s ease",
    padding: "10px 12px",
    textAlign: "left",
  };
}

function get_toolbar_action_icon_style(
  b_active: boolean = false,
  b_disabled: boolean = false,
  s_icon_color?: string
): React.CSSProperties {
  return {
    fontSize: "1rem",
    color: b_disabled
      ? "var(--color_text_muted)"
      : s_icon_color
      ? s_icon_color
      : b_active
      ? "var(--color_accent_text)"
      : "var(--color_text)",
    flexShrink: 0,
  };
}

function get_toolbar_action_label_style(
  b_active: boolean = false,
  b_disabled: boolean = false
): React.CSSProperties {
  return {
    fontSize: "0.82rem",
    lineHeight: 1.2,
    fontWeight: 700,
    color: b_disabled
      ? "var(--color_text_muted)"
      : b_active
      ? "var(--color_accent_text)"
      : "var(--color_text)",
  };
}

function get_canvas_top_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 18px",
    borderBottom: "1px solid var(--color_border)",
    background: "var(--color_panel)",
  };
}

function get_canvas_title_group_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  };
}

function get_canvas_title_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "18px",
    fontWeight: 800,
    color: "var(--color_text)",
  };
}

function get_canvas_subtitle_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "12px",
    color: "var(--color_text_muted)",
  };
}

function get_canvas_wrapper_style(): React.CSSProperties {
  return {
    flex: 1,
    minHeight: 0,
    position: "relative",
  };
}

function get_run_status_badge_style(
  s_run_state: TWorkflowRunState
): React.CSSProperties {
  let s_background = "rgba(107, 114, 128, 0.12)";
  let s_color = "#6b7280";

  if (s_run_state === "starting") {
    s_background = "rgba(245, 158, 11, 0.16)";
    s_color = "#d97706";
  } else if (s_run_state === "running") {
    s_background = "rgba(34, 197, 94, 0.16)";
    s_color = "#16a34a";
  } else if (s_run_state === "finished") {
    s_background = "rgba(16, 185, 129, 0.16)";
    s_color = "#059669";
  } else if (s_run_state === "error") {
    s_background = "rgba(239, 68, 68, 0.16)";
    s_color = "#dc2626";
  } else if (s_run_state === "stopped") {
    s_background = "rgba(107, 114, 128, 0.16)";
    s_color = "#4b5563";
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    borderRadius: "999px",
    background: s_background,
    color: s_color,
    fontSize: "12px",
    fontWeight: 800,
  };
}

function get_helper_line_segment_style(
  o_segment: THelperLineSegment
): React.CSSProperties {
  return {
    position: "absolute",
    left: `${o_segment.d_left}px`,
    top: `${o_segment.d_top}px`,
    width: `${o_segment.d_width}px`,
    height: `${o_segment.d_height}px`,
    background: "rgba(59, 130, 246, 0.75)",
    pointerEvents: "none",
    zIndex: 10,
    borderRadius: "999px",
  };
}

function get_node_execution_style(
  s_node_status: TNodeExecutionStatus
): React.CSSProperties | undefined {
  if (s_node_status === "running") {
    return {
      border: "2px solid #22c55e",
      boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.15)",
      background: "rgba(34, 197, 94, 0.06)",
    };
  }
  if (s_node_status === "success") {
    return {
      border: "2px solid #16a34a",
      boxShadow: "0 0 0 3px rgba(22, 163, 74, 0.12)",
      background: "rgba(22, 163, 74, 0.05)",
    };
  }
  if (s_node_status === "error") {
    return {
      border: "2px solid #dc2626",
      boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.12)",
      background: "rgba(220, 38, 38, 0.05)",
    };
  }
  return undefined;
}

function get_workflow_status_label(s_run_state: TWorkflowRunState): string {
  if (s_run_state === "starting") {
    return "Workflow starting";
  }
  if (s_run_state === "running") {
    return "Workflow running";
  }
  if (s_run_state === "finished") {
    return "Workflow finished";
  }
  if (s_run_state === "error") {
    return "Workflow error";
  }
  if (s_run_state === "stopped") {
    return "Workflow stopped";
  }
  return "Workflow idle";
}

function get_title_bar_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  };
}

function get_title_button_style(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    border: "1px solid var(--color_border)",
    background: "var(--color_panel_elevated)",
    color: "var(--color_text)",
    cursor: "pointer",
  };
}

function get_title_input_style(): React.CSSProperties {
  return {
    minWidth: "240px",
    maxWidth: "420px",
    padding: "8px 10px",
    borderRadius: "10px",
    border: "1px solid var(--color_border)",
    background: "var(--color_panel_elevated)",
    color: "var(--color_text)",
    fontSize: "16px",
    fontWeight: 700,
    outline: "none",
  };
}

function is_within_tolerance(
  d_value_a: number,
  d_value_b: number,
  d_tolerance: number = d_alignment_tolerance_px
): boolean {
  return Math.abs(d_value_a - d_value_b) <= d_tolerance;
}

function build_vertical_helper_segment(
  d_x: number,
  o_source_box: TNodeBox,
  o_target_box: TNodeBox
): THelperLineSegment {
  const d_top = Math.min(o_source_box.d_top, o_target_box.d_top);
  const d_bottom = Math.max(o_source_box.d_bottom, o_target_box.d_bottom);
  return {
    d_left: d_x,
    d_top,
    d_width: 1,
    d_height: Math.max(1, d_bottom - d_top),
  };
}

function build_horizontal_helper_segment(
  d_y: number,
  o_source_box: TNodeBox,
  o_target_box: TNodeBox
): THelperLineSegment {
  const d_left = Math.min(o_source_box.d_left, o_target_box.d_left);
  const d_right = Math.max(o_source_box.d_right, o_target_box.d_right);
  return {
    d_left,
    d_top: d_y,
    d_width: Math.max(1, d_right - d_left),
    d_height: 1,
  };
}

function get_runtime_maps_from_result(o_result: unknown): {
  o_outputs: TRecord;
  o_inputs: TRecord;
} {
  if (!o_result || typeof o_result !== "object") {
    return {
      o_outputs: {},
      o_inputs: {},
    };
  }

  const o_safe_result = o_result as TRecord;
  const o_outputs =
    o_safe_result.output && typeof o_safe_result.output === "object"
      ? (o_safe_result.output as TRecord)
      : o_safe_result.outputs && typeof o_safe_result.outputs === "object"
      ? (o_safe_result.outputs as TRecord)
      : {};

  const o_inputs =
    o_safe_result.inputs && typeof o_safe_result.inputs === "object"
      ? (o_safe_result.inputs as TRecord)
      : o_safe_result.input && typeof o_safe_result.input === "object"
      ? (o_safe_result.input as TRecord)
      : {};

  return {
    o_outputs,
    o_inputs,
  };
}

function is_finished_workflow_payload(
  o_payload: TWorkflowStatusPayload
): boolean {
  const s_status = String(o_payload.status || "")
    .trim()
    .toLowerCase();

  if (
    s_status === "finished" ||
    s_status === "completed" ||
    s_status === "complete" ||
    s_status === "done" ||
    s_status === "success" ||
    s_status === "succeeded"
  ) {
    return true;
  }
  if (o_payload.success === true) {
    return true;
  }
  if (o_payload.done === true) {
    return true;
  }
  if (o_payload.completed === true) {
    return true;
  }
  if (o_payload.is_finished === true) {
    return true;
  }
  return false;
}

function is_successful_run_result(o_result: unknown): boolean {
  if (!o_result || typeof o_result !== "object") {
    return false;
  }

  const o_safe_result = o_result as {
    success?: unknown;
    status?: unknown;
    results?: unknown;
    error?: unknown;
  };

  if (o_safe_result.success === true) {
    return true;
  }

  if (typeof o_safe_result.status === "string") {
    const s_status = o_safe_result.status.trim().toLowerCase();
    if (
      s_status === "finished" ||
      s_status === "completed" ||
      s_status === "done" ||
      s_status === "success" ||
      s_status === "succeeded"
    ) {
      return true;
    }
  }

  if (Array.isArray(o_safe_result.results) && !o_safe_result.error) {
    return true;
  }

  return false;
}

function extract_result_array(
  o_payload: TWorkflowStatusPayload | TRunWorkflowResult | unknown
): TRunNodeResult[] {
  if (!o_payload || typeof o_payload !== "object") {
    return [];
  }

  const o_safe_payload = o_payload as { results?: unknown };
  return Array.isArray(o_safe_payload.results)
    ? (o_safe_payload.results as TRunNodeResult[])
    : [];
}

function apply_run_results_to_state(
  a_results: TRunNodeResult[],
  set_node_status_map: React.Dispatch<
    React.SetStateAction<Record<string, TNodeExecutionStatus>>
  >,
  set_node_result_map: React.Dispatch<
    React.SetStateAction<Record<string, unknown>>
  >
): void {
  if (!Array.isArray(a_results) || a_results.length === 0) {
    return;
  }

  const o_next_status_map: Record<string, TNodeExecutionStatus> = {};
  const o_next_result_map: Record<string, unknown> = {};

  for (const o_result of a_results) {
    const s_node_id =
      o_result && typeof o_result.node_id === "string"
        ? o_result.node_id.trim()
        : "";
    const s_status =
      o_result && typeof o_result.status === "string"
        ? o_result.status.trim()
        : "";

    if (s_node_id === "") {
      continue;
    }

    if (s_status === "running") {
      o_next_status_map[s_node_id] = "running";
    } else if (s_status === "success") {
      o_next_status_map[s_node_id] = "success";
    } else if (s_status === "error") {
      o_next_status_map[s_node_id] = "error";
    }

    if (typeof o_result.result !== "undefined") {
      o_next_result_map[s_node_id] = o_result.result;
    }
  }

  if (Object.keys(o_next_status_map).length > 0) {
    set_node_status_map((o_prev) => ({
      ...o_prev,
      ...o_next_status_map,
    }));
  }

  if (Object.keys(o_next_result_map).length > 0) {
    set_node_result_map((o_prev) => ({
      ...o_prev,
      ...o_next_result_map,
    }));
  }
}

function ToolbarActionButton(o_props: TToolbarActionButtonProps): JSX.Element {
  const {
    Icon,
    on_click,
    s_title,
    s_label,
    b_active = false,
    b_disabled = false,
    s_icon_color,
  } = o_props;

  return (
    <button
      aria-label={s_title}
      disabled={b_disabled}
      onClick={() => {
        if (!b_disabled) {
          void on_click();
        }
      }}
      style={get_toolbar_action_button_style(b_active, b_disabled)}
      title={s_title}
      type="button"
    >
      <Icon
        style={get_toolbar_action_icon_style(
          b_active,
          b_disabled,
          s_icon_color
        )}
      />
      <span style={get_toolbar_action_label_style(b_active, b_disabled)}>
        {s_label}
      </span>
    </button>
  );
}

function HoverMenuGroup(o_props: THoverMenuGroupProps): JSX.Element {
  const { o_group, b_right = false } = o_props;
  const [b_open, set_open] = useState(false);
  const o_close_timeout_ref = useRef<number | null>(null);

  function clear_close_timeout(): void {
    if (o_close_timeout_ref.current !== null) {
      window.clearTimeout(o_close_timeout_ref.current);
      o_close_timeout_ref.current = null;
    }
  }

  function open_menu(): void {
    clear_close_timeout();
    set_open(true);
  }

  function close_menu_delayed(): void {
    clear_close_timeout();
    o_close_timeout_ref.current = window.setTimeout(() => {
      set_open(false);
      o_close_timeout_ref.current = null;
    }, 220);
  }

  useEffect(() => {
    return () => {
      clear_close_timeout();
    };
  }, []);

  return (
    <div
      onMouseEnter={open_menu}
      onMouseLeave={close_menu_delayed}
      style={get_group_container_style()}
    >
      <button
        onClick={() => {
          set_open((b_prev) => !b_prev);
        }}
        style={get_group_button_style(b_open)}
        title={o_group.s_group_label}
        type="button"
      >
        <o_group.Icon style={get_group_button_icon_style()} />
        <span style={get_group_button_label_style()}>
          {o_group.s_group_label}
        </span>
      </button>

      {b_open && (
        <div
          onMouseEnter={open_menu}
          onMouseLeave={close_menu_delayed}
          style={
            b_right
              ? get_flyout_style_right(true)
              : get_flyout_style_left(false)
          }
        >
          <p style={get_flyout_title_style()}>{o_group.s_group_label}</p>
          <div style={get_action_list_style()}>
            {o_group.a_actions.map((o_action) => (
              <ToolbarActionButton
                key={`${o_group.s_group_id}_${o_action.s_label}`}
                {...o_action}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentDesignerContent(): JSX.Element {
  const {
    s_workflow_name,
    nodes,
    edges,
    canvas_settings,
    s_selected_node_id,
    a_selected_node_ids,
    on_nodes_change,
    on_edges_change,
    on_connect,
    clear_selection,
    select_node,
    add_chat_message,
    apply_workflow_definition,
    copy_selected_to_json,
    copy_all_to_json,
    cut_selected_to_json,
    paste_from_json,
    delete_selected_nodes,
    open_context_menu,
    undo,
    redo,
    update_canvas_settings,
    select_all_nodes,
    a_chat_messages,
  } = use_workflow_store() as unknown as TWorkflowStoreShape;

  const { a_tool_schemas } = use_tool_registry_store() as {
    a_tool_schemas: Array<{ s_type: string }>;
  };

  const [s_theme_mode, set_theme_mode] = useState<"light" | "dark">("light");
  const [a_live_logs, set_live_logs] = useState<string[]>([]);
  const [b_is_dragging_node, set_is_dragging_node] = useState(false);
  const [s_dragging_node_id, set_dragging_node_id] = useState("");
  const [s_workflow_run_state, set_workflow_run_state] =
    useState<TWorkflowRunState>("idle");
  const [s_workflow_status_text, set_workflow_status_text] =
    useState("Workflow idle");
  const [o_node_status_map, set_node_status_map] = useState<
    Record<string, TNodeExecutionStatus>
  >({});
  const [o_node_result_map, set_node_result_map] = useState<
    Record<string, unknown>
  >({});
  const [b_is_starting_workflow, set_is_starting_workflow] = useState(false);
  const [s_active_workspace_panel, set_active_workspace_panel] =
    useState("workspace_tabs");

  const [s_current_file_name, set_current_file_name] = useState("");
  const [b_is_renaming_workflow, set_is_renaming_workflow] = useState(false);
  const [s_rename_value, set_rename_value] = useState("");

  const o_socket = useMemo(() => get_socket(), []);
  const o_react_flow = useReactFlow();
  const o_file_input_ref = useRef<HTMLInputElement | null>(null);
  const o_right_sidebar_tabs_ref = useRef<TRightSidebarTabsHandle | null>(null);

  const o_runner_panel_ref = useRef<TRunnerPanelHandle | null>(null);

  const o_dynamic_node_types = useMemo((): NodeTypes => {
    const o_result: NodeTypes = {
      ...o_base_node_types,
    };

    for (const o_tool_schema of a_tool_schemas) {
      if (
        o_tool_schema &&
        typeof o_tool_schema.s_type === "string" &&
        o_tool_schema.s_type.trim() !== ""
      ) {
        o_result[o_tool_schema.s_type] = ToolNode;
      }
    }

    return o_result;
  }, [a_tool_schemas]);

  const a_safe_chat_messages = useMemo((): unknown[] => {
    return Array.isArray(a_chat_messages) ? a_chat_messages : [];
  }, [a_chat_messages]);

  const a_nodes_with_runtime_status = useMemo(() => {
    return nodes.map((o_node) => {
      const s_node_status = o_node_status_map[o_node.id] || "idle";
      const o_node_result = o_node_result_map[o_node.id] ?? null;
      const o_existing_style =
        o_node.style && typeof o_node.style === "object" ? o_node.style : {};
      const o_runtime_style = get_node_execution_style(s_node_status);
      const { o_outputs, o_inputs } =
        get_runtime_maps_from_result(o_node_result);

      return {
        ...o_node,
        style: {
          ...o_existing_style,
          ...(o_runtime_style || {}),
        },
        data: {
          ...(o_node.data || {}),
          s_runtime_status: s_node_status,
          result: o_node_result,
          runtime_result: o_node_result,
          o_result: o_node_result,
          output_values: o_outputs,
          input_values: o_inputs,
          outputs: o_outputs,
          inputs: o_inputs,
          b_show_success_check: s_node_status === "success",
        },
      };
    });
  }, [nodes, o_node_status_map, o_node_result_map]);

  useEffect(() => {
    const s_safe_name = get_safe_workflow_name(s_workflow_name);
    set_synchronized_file_name_if_empty(s_safe_name);
  }, [s_workflow_name]);

  function set_synchronized_file_name_if_empty(s_name: string): void {
    set_current_file_name((s_prev) => {
      if (typeof s_prev !== "string" || s_prev.trim() === "") {
        return s_name;
      }
      return s_prev;
    });
  }

  function get_safe_workflow_name(s_name: string): string {
    const s_trimmed = typeof s_name === "string" ? s_name.trim() : "";
    return s_trimmed === "" ? "Neuer Workflow" : s_trimmed;
  }

  function update_workflow_name_only(s_name: string): void {
    const s_safe_name = get_safe_workflow_name(s_name);

    apply_workflow_definition({
      s_name: s_safe_name,
      nodes,
      edges,
      global_variables: [],
      canvas_settings,
    });
  }

  function start_rename_workflow(): void {
    set_rename_value(get_safe_workflow_name(s_workflow_name));
    set_is_renaming_workflow(true);
  }

  function commit_rename_workflow(): void {
    const s_safe_name = get_safe_workflow_name(s_rename_value);
    update_workflow_name_only(s_safe_name);
    set_current_file_name(s_safe_name);
    set_is_renaming_workflow(false);
  }

  function cancel_rename_workflow(): void {
    set_rename_value(get_safe_workflow_name(s_workflow_name));
    set_is_renaming_workflow(false);
  }

  useEffect(() => {
    function on_connect_socket(): void {
      set_live_logs((a_prev) => [...a_prev, "socket_connected"]);
    }

    function on_system_status(o_payload: unknown): void {
      set_live_logs((a_prev) => [
        ...a_prev,
        `system_status: ${JSON.stringify(o_payload)}`,
      ]);
    }

    function on_workflow_status(o_payload: unknown): void {
      set_live_logs((a_prev) => [
        ...a_prev,
        `workflow_status: ${JSON.stringify(o_payload)}`,
      ]);

      const o_safe_payload: TWorkflowStatusPayload =
        o_payload && typeof o_payload === "object"
          ? (o_payload as TWorkflowStatusPayload)
          : {};

      const s_status = String(o_safe_payload.status || "")
        .trim()
        .toLowerCase();

      if (s_status === "started") {
        set_workflow_run_state("running");
        set_workflow_status_text("Workflow running");
        return;
      }

      if (s_status === "running") {
        set_workflow_run_state("running");
        set_workflow_status_text("Workflow running");
        return;
      }

      apply_run_results_to_state(
        extract_result_array(o_safe_payload),
        set_node_status_map,
        set_node_result_map
      );

      if (is_finished_workflow_payload(o_safe_payload)) {
        set_workflow_run_state("finished");
        set_workflow_status_text("Workflow finished");
        set_is_starting_workflow(false);
        return;
      }

      if (s_status === "error" || s_status === "failed") {
        set_workflow_run_state("error");
        set_workflow_status_text(
          o_safe_payload.error
            ? `Workflow error: ${o_safe_payload.error}`
            : "Workflow error"
        );
        set_is_starting_workflow(false);
        return;
      }

      if (s_status === "stopped" || s_status === "cancelled") {
        set_workflow_run_state("stopped");
        set_workflow_status_text("Workflow stopped");
        set_is_starting_workflow(false);
      }
    }

    function on_node_status(o_payload: unknown): void {
      set_live_logs((a_prev) => [
        ...a_prev,
        `node_status: ${JSON.stringify(o_payload)}`,
      ]);

      const o_safe_payload: TNodeStatusPayload =
        o_payload && typeof o_payload === "object"
          ? (o_payload as TNodeStatusPayload)
          : {};

      const s_node_id = String(o_safe_payload.node_id || "").trim();
      const s_status = String(o_safe_payload.status || "").trim();

      if (s_node_id === "") {
        return;
      }

      if (
        s_status !== "running" &&
        s_status !== "success" &&
        s_status !== "error"
      ) {
        return;
      }

      set_node_status_map((o_prev) => ({
        ...o_prev,
        [s_node_id]: s_status as TNodeExecutionStatus,
      }));

      if (typeof o_safe_payload.result !== "undefined") {
        set_node_result_map((o_prev) => ({
          ...o_prev,
          [s_node_id]: o_safe_payload.result,
        }));
      }
    }

    o_socket.on("connect", on_connect_socket);
    o_socket.on("system_status", on_system_status);
    o_socket.on("workflow_status", on_workflow_status);
    o_socket.on("node_status", on_node_status);

    return () => {
      o_socket.off("connect", on_connect_socket);
      o_socket.off("system_status", on_system_status);
      o_socket.off("workflow_status", on_workflow_status);
      o_socket.off("node_status", on_node_status);
    };
  }, [o_socket]);

  function toggle_theme(): void {
    const s_next_theme = s_theme_mode === "light" ? "dark" : "light";
    set_theme_mode(s_next_theme);
    document.documentElement.setAttribute("data-theme", s_next_theme);
  }

  function get_default_empty_workflow_definition(s_name?: string) {
    return {
      s_name: get_safe_workflow_name(s_name || "Neuer Workflow"),
      nodes: [],
      edges: [],
      global_variables: [],
      canvas_settings,
    };
  }

  function get_safe_file_name(s_name: string): string {
    const s_base = (s_name || "workflow")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, "_");

    return s_base === "" ? "workflow" : s_base;
  }

  function is_workflow_empty(): boolean {
    return nodes.length === 0 && edges.length === 0;
  }

  function get_workflow_json_with_name(s_name: string): string {
    const s_raw_json = copy_all_to_json();

    try {
      const o_json = JSON.parse(s_raw_json) as {
        s_name?: string;
        nodes?: unknown[];
        edges?: unknown[];
        global_variables?: unknown[];
        canvas_settings?: unknown;
      };

      const o_safe_json = {
        ...o_json,
        s_name: get_safe_workflow_name(s_name),
      };

      return JSON.stringify(o_safe_json, null, 2);
    } catch {
      return s_raw_json;
    }
  }

  async function download_json_file(
    s_json: string,
    s_file_name_without_extension: string
  ): Promise<void> {
    const o_blob = new Blob([s_json], {
      type: "application/json;charset=utf-8",
    });

    const s_url = URL.createObjectURL(o_blob);
    const o_link = document.createElement("a");

    try {
      o_link.href = s_url;
      o_link.download = `${get_safe_file_name(
        s_file_name_without_extension
      )}.json`;
      document.body.appendChild(o_link);
      o_link.click();
      o_link.remove();
    } finally {
      URL.revokeObjectURL(s_url);
    }
  }

  function ask_for_workflow_name(s_default_name: string): string | null {
    const s_prompt_value = window.prompt(
      "Bitte einen Workflow Namen eingeben:",
      get_safe_workflow_name(s_default_name)
    );

    if (s_prompt_value === null) {
      return null;
    }

    const s_safe_name = get_safe_workflow_name(s_prompt_value);

    if (s_safe_name.trim() === "") {
      window.alert("Der Workflow Name ist ungueltig.");
      return null;
    }

    return s_safe_name;
  }

  function on_new_workflow_click(): void {
    if (!is_workflow_empty()) {
      const b_confirm = window.confirm(
        "Der aktuelle Workflow ist nicht leer. Soll ein neuer leerer Workflow erstellt werden?"
      );
      if (!b_confirm) {
        return;
      }
    }

    const s_new_name = ask_for_workflow_name("Neuer Workflow");
    if (s_new_name === null) {
      return;
    }

    clear_selection();
    apply_workflow_definition(
      get_default_empty_workflow_definition(s_new_name)
    );
    set_current_file_name(s_new_name);
    set_node_status_map({});
    set_node_result_map({});
    set_workflow_run_state("idle");
    set_workflow_status_text("Workflow idle");
  }

  function on_load_file_click(): void {
    o_file_input_ref.current?.click();
  }

  async function on_file_input_change(
    o_event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const o_file = o_event.target.files?.[0];
    o_event.target.value = "";

    if (!o_file) {
      return;
    }

    try {
      const s_text = await o_file.text();
      const o_json = JSON.parse(s_text) as {
        s_name?: string;
        nodes?: unknown[];
        edges?: unknown[];
        global_variables?: unknown[];
        canvas_settings?: typeof canvas_settings;
      };

      const s_loaded_name =
        typeof o_json.s_name === "string" && o_json.s_name.trim() !== ""
          ? o_json.s_name
          : o_file.name.replace(/\.json$/i, "");

      apply_workflow_definition({
        s_name: s_loaded_name,
        nodes: Array.isArray(o_json.nodes) ? (o_json.nodes as Node[]) : [],
        edges: Array.isArray(o_json.edges) ? o_json.edges : [],
        global_variables: Array.isArray(o_json.global_variables)
          ? o_json.global_variables
          : [],
        canvas_settings:
          o_json.canvas_settings && typeof o_json.canvas_settings === "object"
            ? { ...canvas_settings, ...o_json.canvas_settings }
            : canvas_settings,
      });

      set_current_file_name(s_loaded_name);
    } catch {
      window.alert("Die Datei konnte nicht geladen werden.");
    }
  }

  async function on_save_as_file_click(): Promise<void> {
    try {
      const s_target_name = ask_for_workflow_name(
        s_current_file_name || s_workflow_name || "workflow"
      );

      if (s_target_name === null) {
        return;
      }

      update_workflow_name_only(s_target_name);
      set_current_file_name(s_target_name);

      const s_json = get_workflow_json_with_name(s_target_name);
      await download_json_file(s_json, s_target_name);
    } catch {
      set_live_logs((a_prev) => [...a_prev, "workflow_save_as_error"]);
    }
  }

  async function on_save_file_click(): Promise<void> {
    try {
      const s_target_name = get_safe_workflow_name(
        s_current_file_name || s_workflow_name || "workflow"
      );

      update_workflow_name_only(s_target_name);
      set_current_file_name(s_target_name);

      const s_json = get_workflow_json_with_name(s_target_name);
      await download_json_file(s_json, s_target_name);
    } catch {
      set_live_logs((a_prev) => [...a_prev, "workflow_save_error"]);
    }
  }

  async function on_copy_selected_click(): Promise<void> {
    try {
      await navigator.clipboard.writeText(copy_selected_to_json());
    } catch {
      set_live_logs((a_prev) => [...a_prev, "copy_selected_error"]);
    }
  }

  async function on_cut_selected_click(): Promise<void> {
    try {
      await navigator.clipboard.writeText(cut_selected_to_json());
    } catch {
      set_live_logs((a_prev) => [...a_prev, "cut_selected_error"]);
    }
  }

  async function on_paste_click(): Promise<void> {
    try {
      const s_json = await navigator.clipboard.readText();
      if (typeof s_json === "string" && s_json.trim() !== "") {
        paste_from_json(s_json);
      }
    } catch {
      set_live_logs((a_prev) => [...a_prev, "paste_error"]);
    }
  }

  async function on_duplicate_selected_click(): Promise<void> {
    try {
      const s_json = copy_selected_to_json();
      if (typeof s_json === "string" && s_json.trim() !== "") {
        paste_from_json(s_json);
      }
    } catch {
      set_live_logs((a_prev) => [...a_prev, "duplicate_selected_error"]);
    }
  }

  async function on_export_click(): Promise<void> {
    try {
      await navigator.clipboard.writeText(copy_all_to_json());
    } catch {
      set_live_logs((a_prev) => [...a_prev, "workflow_export_error"]);
    }
  }

  async function on_import_click(): Promise<void> {
    try {
      const s_json = await navigator.clipboard.readText();
      if (typeof s_json === "string" && s_json.trim() !== "") {
        paste_from_json(s_json);
      }
    } catch {
      set_live_logs((a_prev) => [...a_prev, "workflow_import_error"]);
    }
  }

  function on_undo_click(): void {
    if (typeof undo === "function") {
      undo();
    }
  }

  function on_redo_click(): void {
    if (typeof redo === "function") {
      redo();
    }
  }

  function on_toggle_grid_click(): void {
    if (typeof update_canvas_settings === "function") {
      update_canvas_settings({
        b_show_grid: !canvas_settings.b_show_grid,
      });
    }
  }

  function on_toggle_snap_click(): void {
    if (typeof update_canvas_settings === "function") {
      update_canvas_settings({
        b_snap_to_grid: !canvas_settings.b_snap_to_grid,
      });
    }
  }

  function on_select_all_click(): void {
    if (typeof select_all_nodes === "function") {
      select_all_nodes();
      return;
    }

    clear_selection();
    for (const o_node of nodes) {
      select_node(o_node.id, true);
    }
  }

  function get_hidden_panel_style(b_visible: boolean): React.CSSProperties {
    return {
      display: b_visible ? "block" : "none",
      width: "100%",
      height: "100%",
      minHeight: 0,
    };
  }

  function get_hidden_runner_host_style(): React.CSSProperties {
  return {
    position: "absolute",
    width: "1px",
    height: "1px",
    opacity: 0,
    pointerEvents: "none",
    overflow: "hidden",
    left: 0,
    top: 0,
  };
}
  function on_runner_result(o_run_result: TRunWorkflowResult): void {
  /*
  central history:
  - 2026-04-22: Shared run result handling added for dedicated hidden runner host. author Marcus Schlieper
  */
  if (!o_run_result || typeof o_run_result !== "object") {
    set_workflow_run_state("error");
    set_workflow_status_text("Workflow error");
    set_is_starting_workflow(false);
    return;
  }

  apply_run_results_to_state(
    extract_result_array(o_run_result),
    set_node_status_map,
    set_node_result_map,
  );

  const b_success = is_successful_run_result(o_run_result);

  if (b_success) {
    set_workflow_run_state("finished");
    set_workflow_status_text("Workflow finished");
    set_is_starting_workflow(false);
    return;
  }

  set_workflow_run_state("error");
  set_workflow_status_text(
    typeof o_run_result.error === "string" && o_run_result.error.trim() !== ""
      ? `Workflow error: ${o_run_result.error}`
      : "Workflow error",
  );
  set_is_starting_workflow(false);
}
  async function on_start_workflow_click(): Promise<void> {
  /*
  central history:
  - 2026-04-22: Workflow start uses always mounted hidden runner panel. author Marcus Schlieper
  */
  if (b_is_starting_workflow) {
    return;
  }

  if (!Array.isArray(nodes) || nodes.length === 0) {
    window.alert("Es sind keine Nodes vorhanden.");
    return;
  }

  set_is_starting_workflow(true);
  set_workflow_run_state("starting");
  set_workflow_status_text("Workflow starting");
  set_node_status_map({});
  set_node_result_map({});

  try {
    const o_runner_panel = o_runner_panel_ref.current;

    if (!o_runner_panel || typeof o_runner_panel.on_run !== "function") {
      throw new Error("Runner panel handle is not available.");
    }

    await o_runner_panel.on_run();
  } catch (o_error) {
    const s_error =
      o_error instanceof Error && o_error.message.trim() !== ""
        ? o_error.message.trim()
        : "Workflow start error";

    set_workflow_run_state("error");
    set_workflow_status_text(`Workflow error: ${s_error}`);
    set_is_starting_workflow(false);
  }
}

  function on_stop_workflow_click(): void {
    set_workflow_run_state("stopped");
    set_workflow_status_text("Workflow stopped");
    set_is_starting_workflow(false);
  }

  async function on_submit_chat_message(s_message: string): Promise<void> {
    const s_safe_message = s_message.trim();

    if (s_safe_message === "") {
      return;
    }

    add_chat_message({
      s_id: `chat_user_${Date.now()}`,
      s_role: "user",
      s_content: s_safe_message,
      s_kind: "message",
    });

    const a_commands = parse_chat_to_commands(s_safe_message, a_tool_schemas);
    const o_executed = execute_workflow_commands([], [], a_commands);
    const o_layouted = build_auto_layout(o_executed.nodes, o_executed.edges);

    apply_workflow_definition({
      s_name: s_workflow_name,
      nodes: o_layouted.nodes,
      edges: o_layouted.edges,
      global_variables: [],
      canvas_settings,
    });

    add_chat_message({
      s_id: `chat_assistant_${Date.now()}`,
      s_role: "assistant",
      s_content: extract_intent_summary(a_commands),
      s_kind: "summary",
      a_commands,
    });
  }

  const a_edges_with_type = useMemo(() => {
    return edges.map((o_edge) => ({
      ...o_edge,
      type: "custom_edge",
    }));
  }, [edges]);

  const o_dragging_node = useMemo(() => {
    if (
      typeof s_dragging_node_id !== "string" ||
      s_dragging_node_id.trim() === ""
    ) {
      return undefined;
    }

    return nodes.find((o_node) => o_node.id === s_dragging_node_id);
  }, [nodes, s_dragging_node_id]);

  const o_helper_lines = useMemo((): THelperLines | null => {
    if (!b_is_dragging_node || !o_dragging_node) {
      return null;
    }

    const o_viewport = o_react_flow.getViewport();

    if (
      !o_viewport ||
      typeof o_viewport.x !== "number" ||
      typeof o_viewport.y !== "number" ||
      typeof o_viewport.zoom !== "number" ||
      o_viewport.zoom === 0
    ) {
      return null;
    }

    const d_zoom = o_viewport.zoom;
    const d_viewport_x = o_viewport.x;
    const d_viewport_y = o_viewport.y;

    function get_node_box(o_node: Node): TNodeBox | null {
      if (!o_node.position) {
        return null;
      }

      const d_width =
        typeof o_node.width === "number" && Number.isFinite(o_node.width)
          ? o_node.width
          : typeof o_node.measured?.width === "number" &&
            Number.isFinite(o_node.measured.width)
          ? o_node.measured.width
          : 0;

      const d_height =
        typeof o_node.height === "number" && Number.isFinite(o_node.height)
          ? o_node.height
          : typeof o_node.measured?.height === "number" &&
            Number.isFinite(o_node.measured.height)
          ? o_node.measured.height
          : 0;

      if (d_width <= 0 || d_height <= 0) {
        return null;
      }

      const d_left_flow = o_node.position.x;
      const d_top_flow = o_node.position.y;
      const d_right_flow = d_left_flow + d_width;
      const d_bottom_flow = d_top_flow + d_height;
      const d_center_x_flow = d_left_flow + d_width / 2;
      const d_center_y_flow = d_top_flow + d_height / 2;

      return {
        d_left: d_left_flow * d_zoom + d_viewport_x,
        d_top: d_top_flow * d_zoom + d_viewport_y,
        d_width: d_width * d_zoom,
        d_height: d_height * d_zoom,
        d_center_x: d_center_x_flow * d_zoom + d_viewport_x,
        d_center_y: d_center_y_flow * d_zoom + d_viewport_y,
        d_right: d_right_flow * d_zoom + d_viewport_x,
        d_bottom: d_bottom_flow * d_zoom + d_viewport_y,
      };
    }

    const o_source_box = get_node_box(o_dragging_node);
    if (!o_source_box) {
      return null;
    }

    let o_result: THelperLines = {};
    let b_has_match = false;

    for (const o_node of nodes) {
      if (!o_node || o_node.id === o_dragging_node.id) {
        continue;
      }

      const o_target_box = get_node_box(o_node);
      if (!o_target_box) {
        continue;
      }

      if (
        !o_result.o_vertical_left &&
        is_within_tolerance(o_source_box.d_left, o_target_box.d_left)
      ) {
        o_result.o_vertical_left = build_vertical_helper_segment(
          o_target_box.d_left,
          o_source_box,
          o_target_box
        );
        b_has_match = true;
      }

      if (
        !o_result.o_vertical_center &&
        is_within_tolerance(o_source_box.d_center_x, o_target_box.d_center_x)
      ) {
        o_result.o_vertical_center = build_vertical_helper_segment(
          o_target_box.d_center_x,
          o_source_box,
          o_target_box
        );
        b_has_match = true;
      }

      if (
        !o_result.o_vertical_right &&
        is_within_tolerance(o_source_box.d_right, o_target_box.d_right)
      ) {
        o_result.o_vertical_right = build_vertical_helper_segment(
          o_target_box.d_right,
          o_source_box,
          o_target_box
        );
        b_has_match = true;
      }

      if (
        !o_result.o_horizontal_top &&
        is_within_tolerance(o_source_box.d_top, o_target_box.d_top)
      ) {
        o_result.o_horizontal_top = build_horizontal_helper_segment(
          o_target_box.d_top,
          o_source_box,
          o_target_box
        );
        b_has_match = true;
      }

      if (
        !o_result.o_horizontal_center &&
        is_within_tolerance(o_source_box.d_center_y, o_target_box.d_center_y)
      ) {
        o_result.o_horizontal_center = build_horizontal_helper_segment(
          o_target_box.d_center_y,
          o_source_box,
          o_target_box
        );
        b_has_match = true;
      }

      if (
        !o_result.o_horizontal_bottom &&
        is_within_tolerance(o_source_box.d_bottom, o_target_box.d_bottom)
      ) {
        o_result.o_horizontal_bottom = build_horizontal_helper_segment(
          o_target_box.d_bottom,
          o_source_box,
          o_target_box
        );
        b_has_match = true;
      }

      if (
        o_result.o_vertical_left &&
        o_result.o_vertical_center &&
        o_result.o_vertical_right &&
        o_result.o_horizontal_top &&
        o_result.o_horizontal_center &&
        o_result.o_horizontal_bottom
      ) {
        break;
      }
    }

    if (!b_has_match) {
      return null;
    }

    return o_result;
  }, [b_is_dragging_node, o_dragging_node, o_react_flow, nodes]);

  const a_file_actions: TToolbarActionButtonProps[] = [
    {
      s_title: "Neuer Workflow",
      s_label: "Neu",
      Icon: FiFilePlus,
      on_click: async () => {
        on_new_workflow_click();
      },
    },
    {
      s_title: "Workflow laden",
      s_label: "Oeffnen",
      Icon: FiFolder,
      on_click: async () => {
        on_load_file_click();
      },
    },
    {
      s_title: "Workflow speichern",
      s_label: "Speichern",
      Icon: FiSave,
      on_click: on_save_file_click,
    },
    {
      s_title: "Workflow speichern unter",
      s_label: "Speichern unter",
      Icon: FiDownload,
      on_click: on_save_as_file_click,
    },
    {
      s_title: "Export",
      s_label: "Export",
      Icon: FiDownload,
      on_click: on_export_click,
    },
    {
      s_title: "Import",
      s_label: "Import",
      Icon: FiUpload,
      on_click: on_import_click,
    },
  ];

  const a_edit_actions: TToolbarActionButtonProps[] = [
    {
      s_title: "Kopieren",
      s_label: "Kopieren",
      Icon: FiCopy,
      on_click: on_copy_selected_click,
      b_disabled: a_selected_node_ids.length === 0,
    },
    {
      s_title: "Ausschneiden",
      s_label: "Ausschneiden",
      Icon: FiScissors,
      on_click: on_cut_selected_click,
      b_disabled: a_selected_node_ids.length === 0,
    },
    {
      s_title: "Einfuegen",
      s_label: "Einfuegen",
      Icon: FiClipboard,
      on_click: on_paste_click,
    },
    {
      s_title: "Duplizieren",
      s_label: "Duplizieren",
      Icon: FiCopy,
      on_click: on_duplicate_selected_click,
      b_disabled: a_selected_node_ids.length === 0,
    },
    {
      s_title: "Loeschen",
      s_label: "Loeschen",
      Icon: FiTrash2,
      on_click: async () => {
        delete_selected_nodes();
      },
      b_disabled: a_selected_node_ids.length === 0,
    },
    {
      s_title: "Alles auswaehlen",
      s_label: "Alle",
      Icon: FiLayers,
      on_click: async () => {
        on_select_all_click();
      },
    },
    {
      s_title: "Undo",
      s_label: "Undo",
      Icon: FiRotateCcw,
      on_click: async () => {
        on_undo_click();
      },
    },
    {
      s_title: "Redo",
      s_label: "Redo",
      Icon: FiRotateCw,
      on_click: async () => {
        on_redo_click();
      },
    },
  ];

  const a_run_actions: TToolbarActionButtonProps[] = [
    {
      s_title: "Start",
      s_label: "Start",
      Icon: FiPlay,
      on_click: on_start_workflow_click,
      b_disabled: b_is_starting_workflow,
      s_icon_color: "#16a34a",
    },
    {
      s_title: "Stop",
      s_label: "Stop",
      Icon: FiSquare,
      on_click: async () => {
        on_stop_workflow_click();
      },
      s_icon_color: "#dc2626",
    },
    {
      s_title: "Step",
      s_label: "Step",
      Icon: FiSkipForward,
      on_click: async () => {
        set_live_logs((a_prev) => [...a_prev, "single_step_clicked"]);
      },
    },
    {
      s_title: "Debug",
      s_label: "Debug",
      Icon: FiActivity,
      on_click: async () => {
        set_live_logs((a_prev) => [...a_prev, "start_debug_clicked"]);
      },
    },
  ];

  const a_layout_actions: TToolbarActionButtonProps[] = [
    {
      s_title: "Grid",
      s_label: "Grid",
      Icon: FiGrid,
      on_click: async () => {
        on_toggle_grid_click();
      },
      b_active: canvas_settings.b_show_grid,
    },
    {
      s_title: "Snap",
      s_label: "Snap",
      Icon: FiCrosshair,
      on_click: async () => {
        on_toggle_snap_click();
      },
      b_active: canvas_settings.b_snap_to_grid,
    },
    {
      s_title: "Auto Layout",
      s_label: "Auto Layout",
      Icon: FiLayout,
      on_click: async () => {
        const o_layouted = build_auto_layout(nodes, edges);
        apply_workflow_definition({
          s_name: s_workflow_name,
          nodes: o_layouted.nodes,
          edges: o_layouted.edges,
          global_variables: [],
          canvas_settings,
        });
      },
    },
    {
      s_title: "Theme",
      s_label: "Theme",
      Icon: s_theme_mode === "light" ? FiMoon : FiSun,
      on_click: async () => {
        toggle_theme();
      },
    },
    {
      s_title: "Refresh",
      s_label: "Refresh",
      Icon: FiRefreshCw,
      on_click: async () => {
        set_live_logs((a_prev) => [...a_prev, "refresh_clicked"]);
      },
    },
    {
      s_title: "Canvas",
      s_label: "Canvas",
      Icon: FiSliders,
      on_click: async () => {
        set_live_logs((a_prev) => [...a_prev, "canvas_settings_clicked"]);
      },
    },
    {
      s_title: "Fit View",
      s_label: "Fit View",
      Icon: FiMaximize2,
      on_click: async () => {
        await o_react_flow.fitView();
      },
    },
  ];

  const a_menu_groups: TMenuGroup[] = [
    {
      s_group_id: "datei",
      s_group_label: "Datei",
      Icon: FiHardDrive,
      a_actions: a_file_actions,
    },
    {
      s_group_id: "bearbeiten",
      s_group_label: "Bearbeiten",
      Icon: FiEdit3,
      a_actions: a_edit_actions,
    },
    {
      s_group_id: "run",
      s_group_label: "Run",
      Icon: FiPlay,
      a_actions: a_run_actions,
    },
    {
      s_group_id: "layout",
      s_group_label: "Layout",
      Icon: FiLayers,
      a_actions: a_layout_actions,
    },
  ];

  const a_workspace_panels: TWorkspacePanel[] = [
    {
      s_panel_id: "workspace_tabs",
      s_label: "Workspace",
      Icon: FiSidebar,
    },
    {
      s_panel_id: "chat",
      s_label: "Chat",
      Icon: FiMessageSquare,
    },
    {
      s_panel_id: "telemetry",
      s_label: "Live Daten",
      Icon: FiActivity,
    },
    {
      s_panel_id: "settings",
      s_label: "Einstellungen",
      Icon: FiSettings,
    },
  ];

  return (
    <div style={get_shell_style()}>
      <input
        accept=".json,application/json"
        onChange={on_file_input_change}
        ref={o_file_input_ref}
        style={{ display: "none" }}
        type="file"
      />

      <div style={get_side_rail_style(false)}>
        <div style={get_brand_style()}>
          <h2 style={get_brand_title_style()}>ExpChat</h2>
          <p style={get_brand_text_style()}>Studio</p>
        </div>

        {a_menu_groups.map((o_group) => (
          <HoverMenuGroup key={o_group.s_group_id} o_group={o_group} />
        ))}
      </div>

      <div style={get_center_panel_style()}>
        <div style={get_canvas_top_style()}>
          <div style={get_canvas_title_group_style()}>
            <div style={get_title_bar_style()}>
              {!b_is_renaming_workflow ? (
                <>
                  <h1 style={get_canvas_title_style()}>
                    {get_safe_workflow_name(s_workflow_name)}
                  </h1>
                  <button
                    onClick={start_rename_workflow}
                    style={get_title_button_style()}
                    title="Workflow Namen aendern"
                    type="button"
                  >
                    <FiEdit3 />
                  </button>
                </>
              ) : (
                <>
                  <input
                    aria-label="Workflow Name"
                    autoFocus={true}
                    onChange={(o_event) => {
                      set_rename_value(o_event.target.value);
                    }}
                    onKeyDown={(o_event) => {
                      if (o_event.key === "Enter") {
                        commit_rename_workflow();
                      } else if (o_event.key === "Escape") {
                        cancel_rename_workflow();
                      }
                    }}
                    style={get_title_input_style()}
                    type="text"
                    value={s_rename_value}
                  />
                  <button
                    onClick={commit_rename_workflow}
                    style={get_title_button_style()}
                    title="Umbenennung speichern"
                    type="button"
                  >
                    <FiCheck />
                  </button>
                  <button
                    onClick={cancel_rename_workflow}
                    style={get_title_button_style()}
                    title="Umbenennung abbrechen"
                    type="button"
                  >
                    <FiX />
                  </button>
                </>
              )}
            </div>

            <p style={get_canvas_subtitle_style()}>
              {nodes.length} Nodes und {edges.length} Verbindungen
            </p>
          </div>

          <div style={get_run_status_badge_style(s_workflow_run_state)}>
            {get_workflow_status_label(s_workflow_run_state)}
          </div>
        </div>

        <div style={get_canvas_wrapper_style()}>
          <ReactFlow
            nodes={a_nodes_with_runtime_status}
            edges={a_edges_with_type}
            nodeTypes={o_dynamic_node_types}
            edgeTypes={o_edge_types}
            onNodesChange={on_nodes_change}
            onEdgesChange={on_edges_change}
            onConnect={on_connect}
            onPaneClick={() => clear_selection()}
            onNodeClick={(o_event, o_node) =>
              select_node(o_node.id, Boolean((o_event as any).shiftKey))
            }
            onNodeDragStart={(_o_event, o_node) => {
              set_dragging_node_id(o_node.id);
              set_is_dragging_node(true);
            }}
            onNodeDragStop={() => {
              set_is_dragging_node(false);
              set_dragging_node_id("");
            }}
            onContextMenu={(o_event) => {
              o_event.preventDefault();
              open_context_menu(o_event.clientX, o_event.clientY);
            }}
            fitView={true}
            snapToGrid={canvas_settings.b_snap_to_grid}
            snapGrid={[
              canvas_settings.i_snap_grid_x,
              canvas_settings.i_snap_grid_y,
            ]}
            nodesDraggable={!canvas_settings.b_lock_canvas}
            nodesConnectable={!canvas_settings.b_lock_canvas}
            elementsSelectable={!canvas_settings.b_lock_canvas}
            panOnDrag={!canvas_settings.b_lock_canvas}
            zoomOnScroll={!canvas_settings.b_lock_canvas}
            zoomOnPinch={!canvas_settings.b_lock_canvas}
            zoomOnDoubleClick={!canvas_settings.b_lock_canvas}
            selectionOnDrag={true}
            multiSelectionKeyCode={["Shift"]}
          >
            {canvas_settings.b_show_grid && (
              <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
            )}
            <MiniMap />
            <Controls />
          </ReactFlow>

          {o_helper_lines?.o_vertical_left && (
            <div
              style={get_helper_line_segment_style(
                o_helper_lines.o_vertical_left
              )}
            />
          )}
          {o_helper_lines?.o_vertical_center && (
            <div
              style={get_helper_line_segment_style(
                o_helper_lines.o_vertical_center
              )}
            />
          )}
          {o_helper_lines?.o_vertical_right && (
            <div
              style={get_helper_line_segment_style(
                o_helper_lines.o_vertical_right
              )}
            />
          )}
          {o_helper_lines?.o_horizontal_top && (
            <div
              style={get_helper_line_segment_style(
                o_helper_lines.o_horizontal_top
              )}
            />
          )}
          {o_helper_lines?.o_horizontal_center && (
            <div
              style={get_helper_line_segment_style(
                o_helper_lines.o_horizontal_center
              )}
            />
          )}
          {o_helper_lines?.o_horizontal_bottom && (
            <div
              style={get_helper_line_segment_style(
                o_helper_lines.o_horizontal_bottom
              )}
            />
          )}
        </div>
      </div>

      <div style={get_side_rail_style(true)}>
        {a_workspace_panels.map((o_panel) => {
          const b_active = s_active_workspace_panel === o_panel.s_panel_id;

          return (
            <button
              key={o_panel.s_panel_id}
              onClick={() => set_active_workspace_panel(o_panel.s_panel_id)}
              style={get_group_button_style(b_active)}
              title={o_panel.s_label}
              type="button"
            >
              <o_panel.Icon style={get_group_button_icon_style()} />
              <span style={get_group_button_label_style()}>
                {o_panel.s_label}
              </span>
            </button>
          );
        })}

        <div style={get_flyout_style_right(true)}>
          <h3 style={get_flyout_title_style()}>
            {a_workspace_panels.find(
              (o_panel) => o_panel.s_panel_id === s_active_workspace_panel
            )?.s_label || "Workspace"}
          </h3>

          <div style={get_workspace_panel_body_style()}>
  {s_active_workspace_panel === "chat" && (
    <ChatPanel
      a_messages={a_safe_chat_messages}
      on_submit_message={on_submit_chat_message}
    />
  )}

  {s_active_workspace_panel === "telemetry" && (
    <div style={{ fontSize: "12px", color: "var(--color_text_muted)" }}>
      {a_live_logs.length === 0 ? (
        <div>No live events</div>
      ) : (
        a_live_logs.map((s_log, i_index) => (
          <div key={`log_${i_index}`}>{s_log}</div>
        ))
      )}
    </div>
  )}

  <div style={get_hidden_runner_host_style()}>
  <RunnerPanel
    ref={o_runner_panel_ref}
    nodes={nodes}
    edges={edges}
    s_workflow_run_state={s_workflow_run_state}
    s_workflow_status_text={s_workflow_status_text}
    on_run_result={on_runner_result}
  />
</div>

  <div style={get_hidden_panel_style(s_active_workspace_panel === "workspace_tabs")}>
    <RightSidebarTabs
      ref={o_right_sidebar_tabs_ref}
      o_selected_node={nodes.find((o_node) => o_node.id === s_selected_node_id)}
      s_workflow_run_state={s_workflow_run_state}
      s_workflow_status_text={s_workflow_status_text}
      on_run_result={on_runner_result}
    />
  </div>

  {s_active_workspace_panel === "settings" && (
    <div>Einstellungen werden hier angezeigt.</div>
  )}
</div>
        </div>

        <input
          ref={o_file_input_ref}
          type="file"
          accept=".json,application/json"
          onChange={on_file_input_change}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}

export function AgentDesigner(): JSX.Element {
  return (
    <ReactFlowProvider>
      <AgentDesignerContent />
    </ReactFlowProvider>
  );
}
