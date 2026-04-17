/* file: frontend/src/components/node_palette.tsx
description: Schoene und stabile Palette fuer das Hinzufuegen neuer Nodes.
history:
- 2026-03-25: Erstellt fuer AgentDesigner. author Marcus Schlieper
- 2026-03-28: Layout und Styling komplett ueberarbeitet fuer bessere Darstellung. author Marcus Schlieper
author Marcus Schlieper
*/
import React from "react";
import { TNodeType } from "../types/workflow";

interface INodePaletteProps {
  on_add_node: (s_type: TNodeType) => void;
}

interface INodePaletteItem {
  s_type: TNodeType;
  s_label: string;
  s_description: string;
  s_color: string;
}

const a_node_types: INodePaletteItem[] = [
  {
    s_type: "start",
    s_label: "Start",
    s_description: "Einstiegspunkt fuer den Workflow",
    s_color: "#dcfce7",
  },
  {
    s_type: "http",
    s_label: "HTTP",
    s_description: "API Aufrufe und Requests",
    s_color: "#dbeafe",
  },
  {
    s_type: "condition",
    s_label: "Condition",
    s_description: "Regeln und Verzweigungen",
    s_color: "#fef3c7",
  },
  {
    s_type: "loop_for",
    s_label: "Loop For",
    s_description: "Iterationen ueber Arrays",
    s_color: "#ede9fe",
  },
  {
    s_type: "llm",
    s_label: "LLM",
    s_description: "Prompts und KI Modelle",
    s_color: "#fae8ff",
  },
  {
    s_type: "group",
    s_label: "Group",
    s_description: "Gruppierung von Nodes",
    s_color: "#e5e7eb",
  },
  {
    s_type: "end",
    s_label: "End",
    s_description: "Endpunkt des Workflows",
    s_color: "#fee2e2",
  },
  {
    s_type: "comment",
    s_label: "Comment",
    s_description: "Kommentar auf dem Canvas",
    s_color: "#fef9c3",
  },
];

function get_wrapper_style(): React.CSSProperties {
  return {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxSizing: "border-box",
  };
}

function get_title_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
    color: "#111827",
  };
}

function get_subtitle_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "13px",
    color: "#6b7280",
    lineHeight: 1.5,
  };
}

function get_grid_style(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
  };
}

function get_button_style(s_color: string): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    padding: "12px 14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };
}

function get_color_badge_style(s_color: string): React.CSSProperties {
  return {
    width: "14px",
    minWidth: "14px",
    height: "40px",
    borderRadius: "8px",
    backgroundColor: s_color,
    border: "1px solid rgba(0, 0, 0, 0.06)",
  };
}

function get_content_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: 0,
  };
}

function get_label_style(): React.CSSProperties {
  return {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.3,
  };
}

function get_description_style(): React.CSSProperties {
  return {
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: 1.4,
  };
}

export function NodePalette({
  on_add_node,
}: INodePaletteProps): JSX.Element {
  return (
    <div style={get_wrapper_style()}>
      <h2 style={get_title_style()}>Node Palette</h2>
      <p style={get_subtitle_style()}>
        Hier lassen sich neue Bausteine fuer den Workflow schnell auf das Canvas
        bringen.
      </p>

      <div style={get_grid_style()}>
        {a_node_types.map((o_item) => (
          <button
            key={o_item.s_type}
            type="button"
            onClick={() => on_add_node(o_item.s_type)}
            style={get_button_style(o_item.s_color)}
            title={o_item.s_description}
          >
            <div style={get_color_badge_style(o_item.s_color)} />
            <div style={get_content_style()}>
              <span style={get_label_style()}>{o_item.s_label}</span>
              <span style={get_description_style()}>
                {o_item.s_description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
