/* file: frontend/src/components/edge_insert_menu.tsx
description: Schoenes Auswahlmenue fuer neue Nodes auf einer Kante.
history:
- 2026-03-27: Erstellt fuer Plus Aktion auf Verbindungen. author Marcus Schlieper
- 2026-03-28: Layout und Styling komplett ueberarbeitet fuer bessere Bedienung. author Marcus Schlieper
author Marcus Schlieper
*/
import React from "react";
import { TNodeType } from "../types/workflow";

interface IEdgeInsertMenuProps {
  on_select: (s_type: TNodeType) => void;
  on_close: () => void;
}

const a_node_types: { s_type: TNodeType; s_label: string; s_color: string }[] = [
  { s_type: "start", s_label: "Start", s_color: "#dcfce7" },
  { s_type: "http", s_label: "HTTP", s_color: "#dbeafe" },
  { s_type: "condition", s_label: "Condition", s_color: "#fef3c7" },
  { s_type: "loop_for", s_label: "Loop For", s_color: "#ede9fe" },
  { s_type: "llm", s_label: "LLM", s_color: "#fae8ff" },
  { s_type: "group", s_label: "Group", s_color: "#e5e7eb" },
  { s_type: "end", s_label: "End", s_color: "#fee2e2" },
  { s_type: "comment", s_label: "Comment", s_color: "#fef9c3" },
];

function get_menu_style(): React.CSSProperties {
  return {
    width: "220px",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "14px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.12)",
    overflow: "hidden",
  };
}

function get_header_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
  };
}

function get_title_style(): React.CSSProperties {
  return {
    fontSize: "13px",
    fontWeight: 700,
    color: "#111827",
  };
}

function get_close_button_style(): React.CSSProperties {
  return {
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    color: "#374151",
    borderRadius: "8px",
    width: "28px",
    height: "28px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: 1,
  };
}

function get_list_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    padding: "8px",
    gap: "6px",
  };
}

function get_item_button_style(): React.CSSProperties {
  return {
    width: "100%",
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    padding: "10px 12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textAlign: "left",
    transition: "all 0.2s ease",
  };
}

function get_color_dot_style(s_color: string): React.CSSProperties {
  return {
    width: "12px",
    minWidth: "12px",
    height: "12px",
    borderRadius: "999px",
    backgroundColor: s_color,
    border: "1px solid rgba(0, 0, 0, 0.08)",
  };
}

function get_item_label_style(): React.CSSProperties {
  return {
    fontSize: "13px",
    fontWeight: 600,
    color: "#111827",
  };
}

export function EdgeInsertMenu({
  on_select,
  on_close,
}: IEdgeInsertMenuProps): JSX.Element {
  return (
    <div style={get_menu_style()}>
      <div style={get_header_style()}>
        <span style={get_title_style()}>Node einfuegen</span>
        <button
          type="button"
          onClick={on_close}
          style={get_close_button_style()}
          title="Schliessen"
        >
          x
        </button>
      </div>

      <div style={get_list_style()}>
        {a_node_types.map((o_item) => (
          <button
            key={o_item.s_type}
            type="button"
            onClick={() => on_select(o_item.s_type)}
            style={get_item_button_style()}
          >
            <span style={get_color_dot_style(o_item.s_color)} />
            <span style={get_item_label_style()}>{o_item.s_label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
