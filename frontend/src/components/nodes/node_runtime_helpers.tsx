/* file: frontend/src/components/nodes/node_runtime_helpers.tsx
description: Gemeinsame Hilfen fuer Node Rendering von Handles, Labels,
Runtime Ergebnissen und dem kompakten Node Design mit aufklappbaren Details.
Erweitert um Hover Tooltips fuer Input und Output Knotenpunkte sowie
leserliche Anzeige von Runtime Werten direkt an Handles.
history:
- 2026-04-06: Erstellt fuer sichtbare Handle Labels und Runtime Ergebnisanzeige. author Marcus Schlieper
- 2026-04-11: Kompaktes Design mit klappbaren Details und Node SVG Icons ergaenzt. author Marcus Schlieper
- 2026-04-12: Default fuer Details auf zugeklappt gesetzt, Runtime Result einklappbar gemacht und Pfeil Darstellung verbessert. author Marcus Schlieper
- 2026-04-12: Hover Infos fuer Input und Output Handles sowie Runtime Werte an Handles hinzugefuegt. author Marcus Schlieper
- 2026-04-13: Runtime Werte fuer Inputs und Outputs robuster gemacht und leserliche Handle Badges ergaenzt. author Marcus Schlieper
author Marcus Schlieper
*/
import React from "react";
import { Handle, Position } from "@xyflow/react";
import {
  get_input_handle_style,
  get_output_handle_style,
} from "./node_handle_styles";

type TRecord = Record<string, unknown>;

export type THandleDefinition = {
  s_key?: string;
  s_label?: string;
  s_description?: string;
};

export type TNodeRuntimeResult = {
  message?: string;
  output?: unknown;
  output_meta?: unknown;
};

export type TNodeEventHandleKey =
  | "on_begin"
  | "on_change"
  | "on_end"
  | "on_error";

export type TNodeActionHandleKey =
  | "use_tool"
  | "use_memory";

export type TNodeEventHandleFlags = {
  b_show_on_begin?: boolean;
  b_show_on_change?: boolean;
  b_show_on_end?: boolean;
  b_show_on_error?: boolean;
};

export type TNodeActionHandleFlags = {
  b_show_use_tool?: boolean;
  b_show_use_memory?: boolean;
};

type TEventHandleDefinition = {
  s_key: TNodeEventHandleKey;
  s_label: string;
};

type TActionHandleDefinition = {
  s_key: TNodeActionHandleKey;
  s_label: string;
};

type TNodeKind =
  | "start"
  | "end"
  | "llm"
  | "classifier"
  | "http"
  | "code"
  | "condition"
  | "switch"
  | "loop"
  | "group"
  | "comment"
  | "tool";

type TRenderNamedHandlesProps = {
  a_handles: THandleDefinition[];
  s_type: "source" | "target";
  o_data?: TRecord;
};

const a_default_event_handles: TEventHandleDefinition[] = [
  {
    s_key: "on_begin",
    s_label: "onBegin",
  },
  {
    s_key: "on_change",
    s_label: "onChange",
  },
  {
    s_key: "on_end",
    s_label: "onEnd",
  },
  {
    s_key: "on_error",
    s_label: "onError",
  },
];

const a_default_action_handles: TActionHandleDefinition[] = [
  {
    s_key: "use_tool",
    s_label: "useTool",
  },
  {
    s_key: "use_memory",
    s_label: "useMemory",
  },
];

export function get_safe_handle_definitions(
  a_handles: unknown,
  a_fallback_handles: THandleDefinition[],
): THandleDefinition[] {
  if (!Array.isArray(a_handles) || a_handles.length === 0) {
    return a_fallback_handles;
  }

  const a_result: THandleDefinition[] = [];

  for (const o_item of a_handles) {
    if (!o_item || typeof o_item !== "object") {
      continue;
    }

    const o_handle = o_item as THandleDefinition;
    const s_safe_key =
      typeof o_handle.s_key === "string" && o_handle.s_key.trim() !== ""
        ? o_handle.s_key.trim()
        : "";
    const s_safe_label =
      typeof o_handle.s_label === "string" && o_handle.s_label.trim() !== ""
        ? o_handle.s_label.trim()
        : s_safe_key;

    a_result.push({
      s_key: s_safe_key,
      s_label: s_safe_label,
      s_description:
        typeof o_handle.s_description === "string"
          ? o_handle.s_description
          : "",
    });
  }

  return a_result.length > 0 ? a_result : a_fallback_handles;
}

export function get_safe_runtime_status(s_value: unknown): string {
  return typeof s_value === "string" && s_value.trim() !== ""
    ? s_value.trim()
    : "idle";
}

export function get_runtime_result(o_data: TRecord): unknown {
  if (typeof o_data.result !== "undefined" && o_data.result !== null) {
    return o_data.result;
  }

  if (typeof o_data.o_result !== "undefined" && o_data.o_result !== null) {
    return o_data.o_result;
  }

  if (
    typeof o_data.runtime_result !== "undefined" &&
    o_data.runtime_result !== null
  ) {
    return o_data.runtime_result;
  }

  return null;
}

function get_nested_value(
  o_value: unknown,
  a_path: string[],
): unknown {
  let o_current: unknown = o_value;

  for (const s_part of a_path) {
    if (!o_current || typeof o_current !== "object") {
      return undefined;
    }

    if (!(s_part in (o_current as TRecord))) {
      return undefined;
    }

    o_current = (o_current as TRecord)[s_part];
  }

  return o_current;
}

function stringify_safe(o_value: unknown): string {
  if (o_value === null || typeof o_value === "undefined") {
    return "No value";
  }

  if (typeof o_value === "string") {
    return o_value;
  }

  if (
    typeof o_value === "number" ||
    typeof o_value === "boolean" ||
    typeof o_value === "bigint"
  ) {
    return String(o_value);
  }

  try {
    return JSON.stringify(o_value, null, 2);
  } catch (_o_exc) {
    return String(o_value);
  }
}

function get_short_runtime_text(o_value: unknown): string {
  const s_text = stringify_safe(o_value).trim();

  if (s_text === "" || s_text === "No value") {
    return "";
  }

  const s_single_line = s_text.replace(/\s+/g, " ").trim();

  if (s_single_line.length <= 64) {
    return s_single_line;
  }

  return s_single_line.slice(0, 61) + "...";
}

export function get_handle_runtime_value(
  o_data: TRecord | undefined,
  s_type: "source" | "target",
  s_handle_key: string,
): string {
  if (
    !o_data ||
    typeof s_handle_key !== "string" ||
    s_handle_key.trim() === ""
  ) {
    return "";
  }

  const s_safe_key = s_handle_key.trim();
  const o_result = get_runtime_result(o_data);
  const a_candidate_roots =
    s_type === "source"
      ? ["output", "outputs", "result", "value"]
      : ["inputs", "input", "context", "request"];

  const a_candidate_values: unknown[] = [];

  if (o_result && typeof o_result === "object") {
    for (const s_root of a_candidate_roots) {
      const o_direct_candidate = get_nested_value(o_result, [s_root, s_safe_key]);
      if (typeof o_direct_candidate !== "undefined") {
        a_candidate_values.push(o_direct_candidate);
      }
    }

    const o_direct_on_root = get_nested_value(o_result, [s_safe_key]);
    if (typeof o_direct_on_root !== "undefined") {
      a_candidate_values.push(o_direct_on_root);
    }
  }

  const o_data_direct =
    s_type === "source"
      ? (o_data.output_values as unknown)
      : (o_data.input_values as unknown);

  if (o_data_direct && typeof o_data_direct === "object") {
    const o_mapped_value = (o_data_direct as TRecord)[s_safe_key];
    if (typeof o_mapped_value !== "undefined") {
      a_candidate_values.push(o_mapped_value);
    }
  }

  if (s_type === "target" && typeof o_data[s_safe_key] !== "undefined") {
    a_candidate_values.push(o_data[s_safe_key]);
  }

  for (const o_candidate of a_candidate_values) {
    const s_text = get_short_runtime_text(o_candidate);
    if (s_text !== "") {
      return s_text;
    }
  }

  return "";
}

function get_handle_hover_text(
  o_handle: THandleDefinition,
  s_handle_key: string,
  s_handle_label: string,
  s_type: "source" | "target",
  o_data?: TRecord,
): string {
  const s_kind = s_type === "source" ? "Output" : "Input";
  const s_description =
    typeof o_handle.s_description === "string" && o_handle.s_description.trim() !== ""
      ? o_handle.s_description.trim()
      : "";
  const s_runtime_value = get_handle_runtime_value(o_data, s_type, s_handle_key);

  const a_lines: string[] = [];
  a_lines.push(s_kind + ": " + s_handle_label);
  a_lines.push("Variable: " + s_handle_key);

  if (s_description !== "") {
    a_lines.push("Info: " + s_description);
  }

  if (s_runtime_value !== "") {
    a_lines.push("Value: " + s_runtime_value);
  }

  return a_lines.join("\n");
}

export function get_runtime_result_text(o_result: unknown): string {
  if (o_result === null || typeof o_result === "undefined") {
    return "No result";
  }

  const a_candidate_paths: string[][] = [
    ["output", "result"],
    ["output", "frontend_result"],
    ["output", "value"],
    ["result"],
    ["frontend_result"],
    ["value"],
  ];

  for (const a_path of a_candidate_paths) {
    const o_candidate = get_nested_value(o_result, a_path);
    if (typeof o_candidate !== "undefined" && o_candidate !== null) {
      return stringify_safe(o_candidate);
    }
  }

  return stringify_safe(o_result);
}

export function get_node_wrapper_style(): React.CSSProperties {
  return {
    minWidth: "280px",
    maxWidth: "280px",
    width: "280px",
    border: "1px solid #dbe2ea",
    borderRadius: "18px",
    background:
      "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(249,250,251,1) 100%)",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.10)",
    overflow: "visible",
    position: "relative",
    paddingBottom: "46px",
    boxSizing: "border-box",
    backdropFilter: "blur(6px)",
  };
}

export function get_node_header_style(
  s_background_color: string,
  s_border_color: string,
): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "12px 14px",
    borderRadius: "18px 18px 0 0",
    background:
      "linear-gradient(180deg, " +
      s_background_color +
      " 0%, rgba(255,255,255,0.88) 100%)",
    borderBottom: "1px solid " + s_border_color,
    fontWeight: 700,
    fontSize: "14px",
    color: "#0f172a",
  };
}

export function get_node_body_style(): React.CSSProperties {
  return {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    overflow: "hidden",
    boxSizing: "border-box",
  };
}

export function get_meta_style(): React.CSSProperties {
  return {
    fontSize: "12px",
    color: "#64748b",
  };
}

export function get_label_style(): React.CSSProperties {
  return {
    fontSize: "12px",
    fontWeight: 700,
    color: "#334155",
    marginBottom: "4px",
    display: "block",
  };
}

export function get_input_style(): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    border: "1px solid #dbe2ea",
    borderRadius: "10px",
    padding: "9px 11px",
    fontSize: "13px",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    outline: "none",
  };
}

export function get_runtime_box_style(): React.CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    backgroundColor: "#f8fafc",
    padding: "10px",
    marginTop: "4px",
    maxWidth: "100%",
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  };
}

export function get_runtime_title_style(): React.CSSProperties {
  return {
    margin: "0 0 6px 0",
    fontSize: "12px",
    fontWeight: 700,
    color: "#334155",
  };
}

export function get_runtime_pre_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "12px",
    lineHeight: 1.45,
    color: "#0f172a",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    maxHeight: "220px",
    maxWidth: "100%",
    overflowX: "auto",
    overflowY: "auto",
    display: "block",
  };
}

export function get_handle_label_style(
  s_side: "left" | "right",
  d_top: number,
): React.CSSProperties {
  return {
    position: "absolute",
    top: d_top - 14,
    left: s_side === "left" ? "-10px" : undefined,
    right: s_side === "right" ? "-10px" : undefined,
    transform:
      s_side === "left" ? "translateX(-100%)" : "translateX(100%)",
    fontSize: "11px",
    lineHeight: 1.2,
    color: "#334155",
    backgroundColor: "#ffffff",
    border: "1px solid #dbe2ea",
    borderRadius: "999px",
    padding: "4px 8px",
    whiteSpace: "nowrap",
    userSelect: "text",
    WebkitUserSelect: "text",
    cursor: "help",
    zIndex: 20,
    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
    maxWidth: "190px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

export function get_handle_value_style(
  s_side: "left" | "right",
  d_top: number,
): React.CSSProperties {
  return {
    position: "absolute",
    top: d_top + 10,
    left: s_side === "left" ? "-10px" : undefined,
    right: s_side === "right" ? "-10px" : undefined,
    transform:
      s_side === "left" ? "translateX(-100%)" : "translateX(100%)",
    fontSize: "10px",
    lineHeight: 1.3,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
    border: "1px solid #dbe2ea",
    borderRadius: "10px",
    padding: "5px 8px",
    userSelect: "text",
    WebkitUserSelect: "text",
    cursor: "text",
    zIndex: 20,
    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.06)",
    maxWidth: "190px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };
}

export function get_handle_top_by_index(i_index: number): number {
  return 62 + i_index * 42;
}

export function get_safe_event_handle_flags(
  o_data: TRecord,
): TNodeEventHandleFlags {
  return {
    b_show_on_begin: o_data.b_show_on_begin === true,
    b_show_on_change: o_data.b_show_on_change === true,
    b_show_on_end: o_data.b_show_on_end === true,
    b_show_on_error: o_data.b_show_on_error === true,
  };
}

export function get_safe_action_handle_flags(
  o_data: TRecord,
): TNodeActionHandleFlags {
  return {
    b_show_use_tool: o_data.b_show_use_tool === true,
    b_show_use_memory: o_data.b_show_use_memory === true,
  };
}

export function get_visible_event_handles(
  o_data: TRecord,
): TEventHandleDefinition[] {
  const o_flags = get_safe_event_handle_flags(o_data);

  return a_default_event_handles.filter((o_item) => {
    if (o_item.s_key === "on_begin") {
      return o_flags.b_show_on_begin === true;
    }
    if (o_item.s_key === "on_change") {
      return o_flags.b_show_on_change === true;
    }
    if (o_item.s_key === "on_end") {
      return o_flags.b_show_on_end === true;
    }
    if (o_item.s_key === "on_error") {
      return o_flags.b_show_on_error === true;
    }
    return false;
  });
}

export function get_visible_action_handles(
  o_data: TRecord,
): TActionHandleDefinition[] {
  const o_flags = get_safe_action_handle_flags(o_data);

  return a_default_action_handles.filter((o_item) => {
    if (o_item.s_key === "use_tool") {
      return o_flags.b_show_use_tool === true;
    }
    if (o_item.s_key === "use_memory") {
      return o_flags.b_show_use_memory === true;
    }
    return false;
  });
}

export function get_event_handle_left_by_index(
  i_index: number,
  i_count: number,
): string {
  const i_safe_count = Math.max(1, i_count);
  const d_step = 100 / (i_safe_count + 1);
  const d_left = d_step * (i_index + 1);
  return d_left.toFixed(3) + "%";
}

export function get_event_handle_style(
  d_left_percent: string,
): React.CSSProperties {
  return {
    position: "absolute",
    left: d_left_percent,
    bottom: "-8px",
    width: "14px",
    height: "14px",
    borderRadius: "3px",
    background: "#ffffff",
    border: "2px solid #64748b",
    transform: "translateX(-50%) rotate(45deg)",
    zIndex: 15,
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.10)",
  };
}

export function get_event_handle_label_style(
  d_left_percent: string,
): React.CSSProperties {
  return {
    position: "absolute",
    left: d_left_percent,
    bottom: "-31px",
    transform: "translateX(-50%)",
    fontSize: "10px",
    lineHeight: 1.1,
    color: "#334155",
    backgroundColor: "#ffffff",
    border: "1px solid #dbe2ea",
    borderRadius: "999px",
    padding: "3px 6px",
    whiteSpace: "nowrap",
    zIndex: 20,
    userSelect: "text",
    WebkitUserSelect: "text",
  };
}

export function get_action_handle_style(
  d_left_percent: string,
): React.CSSProperties {
  return {
    position: "absolute",
    left: d_left_percent,
    top: "-8px",
    width: "14px",
    height: "14px",
    borderRadius: "3px",
    background: "#ffffff",
    border: "2px solid #2563eb",
    transform: "translateX(-50%) rotate(45deg)",
    zIndex: 15,
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.18)",
  };
}

export function get_action_handle_label_style(
  d_left_percent: string,
): React.CSSProperties {
  return {
    position: "absolute",
    left: d_left_percent,
    top: "-31px",
    transform: "translateX(-50%)",
    fontSize: "10px",
    lineHeight: 1.1,
    color: "#334155",
    backgroundColor: "#ffffff",
    border: "1px solid #dbe2ea",
    borderRadius: "999px",
    padding: "3px 6px",
    whiteSpace: "nowrap",
    zIndex: 20,
    userSelect: "text",
    WebkitUserSelect: "text",
  };
}

export function get_node_title_row_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
    flex: 1,
  };
}

export function get_node_title_text_wrap_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: "2px",
  };
}

export function get_node_title_style(): React.CSSProperties {
  return {
    fontSize: "14px",
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.15,
    margin: 0,
  };
}

export function get_node_subtitle_style(): React.CSSProperties {
  return {
    fontSize: "11px",
    color: "#64748b",
    lineHeight: 1.15,
    margin: 0,
  };
}

export function get_summary_chip_style(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    color: "#475569",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "999px",
    padding: "5px 9px",
  };
}

export function get_collapsible_section_style(): React.CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    backgroundColor: "#ffffff",
    overflow: "hidden",
    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.04)",
  };
}

export function get_collapsible_summary_style(): React.CSSProperties {
  return {
    listStyle: "none",
    cursor: "pointer",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#334155",
    backgroundColor: "#f8fafc",
    userSelect: "none",
  };
}

export function get_collapsible_body_style(): React.CSSProperties {
  return {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    backgroundColor: "#ffffff",
  };
}

export function get_stack_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  };
}

export function get_row_wrap_style(): React.CSSProperties {
  return {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  };
}

export function get_node_icon_wrap_style(
  s_kind: TNodeKind,
): React.CSSProperties {
  const o_palette = get_node_palette(s_kind);

  return {
    width: "34px",
    height: "34px",
    minWidth: "34px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, " +
      o_palette.s_bg +
      " 0%, rgba(255,255,255,0.98) 100%)",
    border: "1px solid " + o_palette.s_border,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
  };
}

export function get_node_palette(
  s_kind: TNodeKind,
): { s_bg: string; s_border: string; s_stroke: string; s_fill: string } {
  if (s_kind === "start") {
    return {
      s_bg: "rgba(16, 185, 129, 0.18)",
      s_border: "rgba(16, 185, 129, 0.35)",
      s_stroke: "#059669",
      s_fill: "#d1fae5",
    };
  }

  if (s_kind === "end") {
    return {
      s_bg: "rgba(239, 68, 68, 0.16)",
      s_border: "rgba(239, 68, 68, 0.30)",
      s_stroke: "#dc2626",
      s_fill: "#fee2e2",
    };
  }

  if (s_kind === "llm") {
    return {
      s_bg: "rgba(139, 92, 246, 0.18)",
      s_border: "rgba(139, 92, 246, 0.34)",
      s_stroke: "#7c3aed",
      s_fill: "#ede9fe",
    };
  }

  if (s_kind === "classifier") {
    return {
      s_bg: "rgba(168, 85, 247, 0.18)",
      s_border: "rgba(168, 85, 247, 0.34)",
      s_stroke: "#9333ea",
      s_fill: "#f3e8ff",
    };
  }

  if (s_kind === "http") {
    return {
      s_bg: "rgba(59, 130, 246, 0.18)",
      s_border: "rgba(59, 130, 246, 0.34)",
      s_stroke: "#2563eb",
      s_fill: "#dbeafe",
    };
  }

  if (s_kind === "code") {
    return {
      s_bg: "rgba(15, 23, 42, 0.16)",
      s_border: "rgba(51, 65, 85, 0.28)",
      s_stroke: "#0f172a",
      s_fill: "#e2e8f0",
    };
  }

  if (s_kind === "condition") {
    return {
      s_bg: "rgba(245, 158, 11, 0.18)",
      s_border: "rgba(245, 158, 11, 0.34)",
      s_stroke: "#d97706",
      s_fill: "#fef3c7",
    };
  }

  if (s_kind === "switch") {
    return {
      s_bg: "rgba(249, 115, 22, 0.18)",
      s_border: "rgba(249, 115, 22, 0.34)",
      s_stroke: "#ea580c",
      s_fill: "#ffedd5",
    };
  }

  if (s_kind === "loop") {
    return {
      s_bg: "rgba(20, 184, 166, 0.18)",
      s_border: "rgba(20, 184, 166, 0.34)",
      s_stroke: "#0f766e",
      s_fill: "#ccfbf1",
    };
  }

  if (s_kind === "group") {
    return {
      s_bg: "rgba(99, 102, 241, 0.18)",
      s_border: "rgba(99, 102, 241, 0.34)",
      s_stroke: "#4f46e5",
      s_fill: "#e0e7ff",
    };
  }

  if (s_kind === "comment") {
    return {
      s_bg: "rgba(234, 179, 8, 0.18)",
      s_border: "rgba(234, 179, 8, 0.34)",
      s_stroke: "#ca8a04",
      s_fill: "#fef9c3",
    };
  }

  return {
    s_bg: "rgba(37, 99, 235, 0.18)",
    s_border: "rgba(37, 99, 235, 0.34)",
    s_stroke: "#2563eb",
    s_fill: "#dbeafe",
  };
}

export function NodeTypeIcon(
  o_props: {
    s_kind: TNodeKind;
  },
): JSX.Element {
  const { s_kind } = o_props;
  const o_palette = get_node_palette(s_kind);

  const o_common = {
    stroke: o_palette.s_stroke,
    fill: "none",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <div style={get_node_icon_wrap_style(s_kind)}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        {s_kind === "start" && <circle cx="12" cy="12" r="5" {...o_common} fill={o_palette.s_fill} />}
        {s_kind === "end" && <rect x="6" y="6" width="12" height="12" rx="3" {...o_common} fill={o_palette.s_fill} />}
        {s_kind === "http" && (
          <>
            <path d="M5 12h14" {...o_common} />
            <path d="M13 6l6 6l-6 6" {...o_common} />
          </>
        )}
        {s_kind === "code" && (
          <>
            <path d="M9 8l-4 4l4 4" {...o_common} />
            <path d="M15 8l4 4l-4 4" {...o_common} />
          </>
        )}
        {s_kind === "condition" && <path d="M12 4l8 8l-8 8l-8-8z" {...o_common} fill={o_palette.s_fill} />}
        {s_kind === "switch" && (
          <>
            <path d="M7 7h10" {...o_common} />
            <path d="M7 12h10" {...o_common} />
            <path d="M7 17h10" {...o_common} />
          </>
        )}
        {s_kind === "loop" && (
          <>
            <path d="M7 7h8a4 4 0 014 4" {...o_common} />
            <path d="M17 5l2 6l-6-2" {...o_common} />
          </>
        )}
        {s_kind === "llm" && (
          <>
            <rect x="5" y="5" width="14" height="14" rx="4" {...o_common} fill={o_palette.s_fill} />
            <path d="M9 10h6" {...o_common} />
            <path d="M9 14h4" {...o_common} />
          </>
        )}
        {s_kind === "classifier" && (
          <>
            <circle cx="8" cy="9" r="2" {...o_common} fill={o_palette.s_fill} />
            <circle cx="16" cy="9" r="2" {...o_common} fill={o_palette.s_fill} />
            <path d="M6 16h12" {...o_common} />
          </>
        )}
        {s_kind === "group" && (
          <>
            <rect x="4" y="5" width="7" height="6" rx="1.5" {...o_common} fill={o_palette.s_fill} />
            <rect x="13" y="5" width="7" height="6" rx="1.5" {...o_common} fill={o_palette.s_fill} />
            <rect x="8.5" y="13" width="7" height="6" rx="1.5" {...o_common} fill={o_palette.s_fill} />
          </>
        )}
        {s_kind === "comment" && (
          <>
            <path d="M6 7h12v8H10l-4 3V7z" {...o_common} fill={o_palette.s_fill} />
          </>
        )}
        {![
          "start",
          "end",
          "http",
          "code",
          "condition",
          "switch",
          "loop",
          "llm",
          "classifier",
          "group",
          "comment",
        ].includes(s_kind) && <circle cx="12" cy="12" r="6" {...o_common} fill={o_palette.s_fill} />}
      </svg>
    </div>
  );
}

export function NodeHeaderTitle(
  o_props: {
    s_kind: TNodeKind;
    s_title: string;
    s_subtitle?: string;
  },
): JSX.Element {
  return (
    <div style={get_node_title_row_style()}>
      <NodeTypeIcon s_kind={o_props.s_kind} />
      <div style={get_node_title_text_wrap_style()}>
        <p style={get_node_title_style()}>{o_props.s_title}</p>
        {o_props.s_subtitle ? (
          <p style={get_node_subtitle_style()}>{o_props.s_subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

export function NodeDetailsSection(
  o_props: {
    s_title: string;
    s_meta?: string;
    b_default_open?: boolean;
    children: React.ReactNode;
  },
): JSX.Element {
  return (
    <details
      open={o_props.b_default_open === true}
      style={get_collapsible_section_style()}
    >
      <summary style={get_collapsible_summary_style()}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span className="node_details_arrow" style={{ display: "inline-flex", transition: "transform 0.16s ease" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 4.5l3 3l3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>{o_props.s_title}</span>
        </span>
        <span style={get_meta_style()}>{o_props.s_meta || "show"}</span>
      </summary>

      <div style={get_collapsible_body_style()}>{o_props.children}</div>

      <style>
        {`
          details > summary::-webkit-details-marker {
            display: none;
          }

          details > summary {
            list-style: none;
          }

          details[open] .node_details_arrow {
            transform: rotate(180deg);
          }
        `}
      </style>
    </details>
  );
}

export function RenderNamedHandles(
  o_props: TRenderNamedHandlesProps,
): JSX.Element {
  const { a_handles, s_type, o_data } = o_props;

  return (
    <>
      {a_handles.map((o_handle, i_index) => {
        const s_handle_key =
          typeof o_handle.s_key === "string" && o_handle.s_key.trim() !== ""
            ? o_handle.s_key.trim()
            : (s_type === "target" ? "input_" : "output_") +
              String(i_index + 1);

        const s_handle_label =
          typeof o_handle.s_label === "string" &&
          o_handle.s_label.trim() !== ""
            ? o_handle.s_label.trim()
            : s_handle_key;

        const d_top = get_handle_top_by_index(i_index);
        const s_runtime_value = get_handle_runtime_value(
          o_data,
          s_type,
          s_handle_key,
        );
        const s_hover_text = get_handle_hover_text(
          o_handle,
          s_handle_key,
          s_handle_label,
          s_type,
          o_data,
        );

        if (s_type === "target") {
          return (
            <React.Fragment key={s_handle_key}>
              <Handle
                type="target"
                position={Position.Left}
                id={s_handle_key}
                style={get_input_handle_style(d_top)}
                title={s_hover_text}
              />
              <div style={get_handle_label_style("left", d_top)} title={s_hover_text}>
                {s_handle_label}
              </div>
              {s_runtime_value !== "" ? (
                <div style={get_handle_value_style("left", d_top)} title={s_hover_text}>
                  {s_runtime_value}
                </div>
              ) : null}
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={s_handle_key}>
            <Handle
              type="source"
              position={Position.Right}
              id={s_handle_key}
              style={get_output_handle_style(d_top)}
              title={s_hover_text}
            />
            <div style={get_handle_label_style("right", d_top)} title={s_hover_text}>
              {s_handle_label}
            </div>
            {s_runtime_value !== "" ? (
              <div style={get_handle_value_style("right", d_top)} title={s_hover_text}>
                {s_runtime_value}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
}

type TRenderEventHandlesProps = {
  o_data: TRecord;
};

export function RenderEventHandles(
  o_props: TRenderEventHandlesProps,
): JSX.Element {
  const { o_data } = o_props;
  const a_event_handles = get_visible_event_handles(o_data);

  if (a_event_handles.length === 0) {
    return <></>;
  }

  return (
    <>
      {a_event_handles.map((o_item, i_index) => {
        const s_left = get_event_handle_left_by_index(
          i_index,
          a_event_handles.length,
        );

        return (
          <React.Fragment key={o_item.s_key}>
            <Handle
              type="source"
              position={Position.Bottom}
              id={o_item.s_key}
              style={get_event_handle_style(s_left)}
            />
            <div style={get_event_handle_label_style(s_left)}>
              {o_item.s_label}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
}

type TRenderActionHandlesProps = {
  o_data: TRecord;
};

export function RenderActionHandles(
  o_props: TRenderActionHandlesProps,
): JSX.Element {
  const { o_data } = o_props;
  const a_action_handles = get_visible_action_handles(o_data);

  if (a_action_handles.length === 0) {
    return <></>;
  }

  return (
    <>
      {a_action_handles.map((o_item, i_index) => {
        const s_left = get_event_handle_left_by_index(
          i_index,
          a_action_handles.length,
        );

        return (
          <React.Fragment key={o_item.s_key}>
            <Handle
              type="target"
              position={Position.Top}
              id={o_item.s_key}
              style={get_action_handle_style(s_left)}
            />
            <div style={get_action_handle_label_style(s_left)}>
              {o_item.s_label}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
}

type TRenderRuntimeResultProps = {
  o_data: TRecord;
};

export function RenderRuntimeResult(
  o_props: TRenderRuntimeResultProps,
): JSX.Element {
  const { o_data } = o_props;
  const s_runtime_status = get_safe_runtime_status(o_data.s_runtime_status);
  const o_result = get_runtime_result(o_data);

  if (
    s_runtime_status !== "success" &&
    s_runtime_status !== "error" &&
    s_runtime_status !== "running"
  ) {
    return <></>;
  }

  return (
    <div style={get_runtime_box_style()}>
      <p style={get_runtime_title_style()}>
        Runtime result - {s_runtime_status}
      </p>
      <pre style={get_runtime_pre_style()}>
        {get_runtime_result_text(o_result)}
      </pre>
    </div>
  );
}
