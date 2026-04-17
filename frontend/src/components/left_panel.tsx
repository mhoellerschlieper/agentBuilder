/* file: frontend/src/components/left_panel.tsx
description: Linkes Panel nur fuer Add Node und Dynamic Tools. Templates, Tool Registry und Global Variables sind ausgelagert.
history:
- 2026-03-25: Erstellt fuer Designer Bedienung. author Marcus Schlieper
- 2026-03-28: Bereinigt damit nur Add Node und Dynamic Tools im linken Panel bleiben. author Marcus Schlieper
author Marcus Schlieper
*/
import React from "react";
import { use_workflow_store } from "../store/workflow_store";
import { TNodeType } from "../types/workflow";
import { use_tool_registry_store } from "../store/tool_registry_store";

interface INodeItem {
  s_type: TNodeType;
  s_label: string;
  s_description: string;
  s_color: string;
}

const a_node_types: INodeItem[] = [
  {
    s_type: "start",
    s_label: "Start",
    s_description: "Startpunkt fuer einen Workflow",
    s_color: "#dcfce7",
  },
  {
    s_type: "http",
    s_label: "HTTP",
    s_description: "API Calls und Requests",
    s_color: "#dbeafe",
  },
  {
    s_type: "condition",
    s_label: "Condition",
    s_description: "Regeln und Entscheidungen",
    s_color: "#fef3c7",
  },
  {
    s_type: "loop_for",
    s_label: "Loop For",
    s_description: "Schleifen ueber Arrays",
    s_color: "#ede9fe",
  },
  {
    s_type: "llm",
    s_label: "LLM",
    s_description: "KI Modell und Prompt Logik",
    s_color: "#fae8ff",
  },
  {
    s_type: "group",
    s_label: "Group",
    s_description: "Gruppiert mehrere Nodes",
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

function get_panel_style(): React.CSSProperties {
  return {
    height: "100%",
    overflowY: "auto",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };
}

function get_header_card_style(): React.CSSProperties {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    backgroundColor: "#ffffff",
    padding: "16px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
  };
}

function get_header_title_style(): React.CSSProperties {
  return {
    margin: "0 0 6px 0",
    fontSize: "20px",
    fontWeight: 700,
    color: "#111827",
  };
}

function get_header_text_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.5,
    color: "#6b7280",
  };
}

function get_section_style(): React.CSSProperties {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    backgroundColor: "#ffffff",
    padding: "14px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  };
}

function get_section_title_style(): React.CSSProperties {
  return {
    margin: "0 0 4px 0",
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827",
  };
}

function get_section_text_style(): React.CSSProperties {
  return {
    margin: "0 0 12px 0",
    fontSize: "12px",
    lineHeight: 1.5,
    color: "#6b7280",
  };
}

function get_grid_style(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
  };
}

function get_button_style(): React.CSSProperties {
  return {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    padding: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textAlign: "left",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
  };
}

function get_badge_style(s_color: string): React.CSSProperties {
  return {
    width: "14px",
    minWidth: "14px",
    height: "42px",
    borderRadius: "8px",
    backgroundColor: s_color,
    border: "1px solid rgba(15, 23, 42, 0.08)",
  };
}

function get_button_content_style(): React.CSSProperties {
  return {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };
}

function get_button_title_style(): React.CSSProperties {
  return {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.3,
  };
}

function get_button_text_style(): React.CSSProperties {
  return {
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: 1.4,
  };
}

function get_empty_style(): React.CSSProperties {
  return {
    border: "1px dashed #cbd5e1",
    borderRadius: "12px",
    padding: "14px",
    fontSize: "13px",
    color: "#6b7280",
    backgroundColor: "#f8fafc",
  };
}

function get_tool_color_by_index(i_index: number): string {
  const a_colors = [
    "#cffafe",
    "#dbeafe",
    "#ede9fe",
    "#fae8ff",
    "#dcfce7",
    "#fef3c7",
    "#fee2e2",
  ];
  return a_colors[i_index % a_colors.length];
}

function get_button_hover_handlers(): {
  on_mouse_enter: (o_event: React.MouseEvent<HTMLButtonElement>) => void;
  on_mouse_leave: (o_event: React.MouseEvent<HTMLButtonElement>) => void;
} {
  return {
    on_mouse_enter: (o_event: React.MouseEvent<HTMLButtonElement>) => {
      o_event.currentTarget.style.transform = "translateY(-1px)";
      o_event.currentTarget.style.boxShadow =
        "0 6px 16px rgba(15, 23, 42, 0.08)";
      o_event.currentTarget.style.borderColor = "#94a3b8";
    },
    on_mouse_leave: (o_event: React.MouseEvent<HTMLButtonElement>) => {
      o_event.currentTarget.style.transform = "translateY(0)";
      o_event.currentTarget.style.boxShadow =
        "0 1px 3px rgba(15, 23, 42, 0.05)";
      o_event.currentTarget.style.borderColor = "#d1d5db";
    },
  };
}

export function LeftPanel(): JSX.Element {
  const { add_node } = use_workflow_store();
  const { a_tool_schemas } = use_tool_registry_store();
  const o_hover_handlers = get_button_hover_handlers();

  return (
    <div style={get_panel_style()}>
      <div style={get_header_card_style()}>
        <h2 style={get_header_title_style()}>Workflow Designer</h2>
        <p style={get_header_text_style()}>
          Neue Nodes und Dynamic Tools lassen sich hier schnell zum Canvas
          hinzufuegen.
        </p>
      </div>

      <div style={get_section_style()}>
        <h3 style={get_section_title_style()}>Add Node</h3>
        <p style={get_section_text_style()}>
          Standard Bausteine fuer typische Workflows.
        </p>

        <div style={get_grid_style()}>
          {a_node_types.map((o_item) => (
            <button
              key={o_item.s_type}
              onClick={() => add_node(o_item.s_type)}
              style={get_button_style()}
              title={o_item.s_description}
              onMouseEnter={o_hover_handlers.on_mouse_enter}
              onMouseLeave={o_hover_handlers.on_mouse_leave}
            >
              <div style={get_badge_style(o_item.s_color)} />
              <div style={get_button_content_style()}>
                <span style={get_button_title_style()}>{o_item.s_label}</span>
                <span style={get_button_text_style()}>
                  {o_item.s_description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={get_section_style()}>
        <h3 style={get_section_title_style()}>Dynamic Tools</h3>
        <p style={get_section_text_style()}>
          JSON definierte Tools aus der Tool Registry.
        </p>

        {a_tool_schemas.length === 0 ? (
          <div style={get_empty_style()}>
            Es sind noch keine Dynamic Tools registriert.
          </div>
        ) : (
          <div style={get_grid_style()}>
            {a_tool_schemas.map((o_tool, i_index) => (
              <button
                key={o_tool.s_type}
                onClick={() => add_node(o_tool.s_type, o_tool)}
                style={get_button_style()}
                title={o_tool.s_description ?? o_tool.s_type}
                onMouseEnter={o_hover_handlers.on_mouse_enter}
                onMouseLeave={o_hover_handlers.on_mouse_leave}
              >
                <div style={get_badge_style(get_tool_color_by_index(i_index))} />
                <div style={get_button_content_style()}>
                  <span style={get_button_title_style()}>{o_tool.s_label}</span>
                  <span style={get_button_text_style()}>
                    {o_tool.s_description && o_tool.s_description.trim() !== ""
                      ? o_tool.s_description
                      : o_tool.s_type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
