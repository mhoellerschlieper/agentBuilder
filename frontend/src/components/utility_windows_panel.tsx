/* file: frontend/src/components/utility_windows_panel.tsx
description: Eigenes Fenster fuer Templates, Tool Registry und Global Variables ausserhalb des linken Panels.
history:
- 2026-03-28: Erstellt fuer ausgelagerte Verwaltungsmodule neben dem Canvas. author Marcus Schlieper
author Marcus Schlieper
*/
import React, { useState } from "react";
import { TemplateSelector } from "./template_selector";
import { ToolRegistryPanel } from "./tool_registry_panel";
import { GlobalVariablesPanel } from "./global_variables_panel";

type TUtilityTab = "templates" | "tool_registry" | "global_variables";

function get_wrapper_style(): React.CSSProperties {
  return {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    borderLeft: "1px solid #e5e7eb",
    boxSizing: "border-box",
    overflow: "hidden",
  };
}

function get_header_style(): React.CSSProperties {
  return {
    padding: "16px",
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f8fafc",
  };
}

function get_title_style(): React.CSSProperties {
  return {
    margin: "0 0 6px 0",
    fontSize: "18px",
    fontWeight: 700,
    color: "#111827",
  };
}

function get_text_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.5,
    color: "#6b7280",
  };
}

function get_tabs_style(): React.CSSProperties {
  return {
    display: "flex",
    gap: "8px",
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
    flexWrap: "wrap",
  };
}

function get_tab_button_style(b_active: boolean): React.CSSProperties {
  return {
    border: b_active ? "1px solid #2563eb" : "1px solid #d1d5db",
    backgroundColor: b_active ? "#eff6ff" : "#ffffff",
    color: b_active ? "#1d4ed8" : "#374151",
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  };
}

function get_content_style(): React.CSSProperties {
  return {
    flex: "1",
    overflowY: "auto",
    padding: "16px",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
  };
}

function get_card_style(): React.CSSProperties {
  return {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "12px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  };
}

export function UtilityWindowsPanel(): JSX.Element {
  const [s_active_tab, set_active_tab] = useState<TUtilityTab>("templates");

  return (
    <div style={get_wrapper_style()}>
      <div style={get_header_style()}>
        <h3 style={get_title_style()}>Verwaltung</h3>
        <p style={get_text_style()}>
          Templates, Tool Registry und globale Variablen laufen in einem eigenen
          Fenster und nicht im linken Panel.
        </p>
      </div>

      <div style={get_tabs_style()}>
        <button
          type="button"
          onClick={() => set_active_tab("templates")}
          style={get_tab_button_style(s_active_tab === "templates")}
        >
          Templates
        </button>
        <button
          type="button"
          onClick={() => set_active_tab("tool_registry")}
          style={get_tab_button_style(s_active_tab === "tool_registry")}
        >
          Tool Registry
        </button>
        <button
          type="button"
          onClick={() => set_active_tab("global_variables")}
          style={get_tab_button_style(s_active_tab === "global_variables")}
        >
          Global Variables
        </button>
      </div>

      <div style={get_content_style()}>
        <div style={get_card_style()}>
          {s_active_tab === "templates" && <TemplateSelector />}
          {s_active_tab === "tool_registry" && <ToolRegistryPanel />}
          {s_active_tab === "global_variables" && <GlobalVariablesPanel />}
        </div>
      </div>
    </div>
  );
}
