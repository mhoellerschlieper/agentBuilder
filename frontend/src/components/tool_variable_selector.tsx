/* file: frontend/src/components/tool_variable_selector.tsx
description: Variablenauswahl fuer dynamische Tool Felder mit sauberem Layout.
history:
- 2026-03-28: Erstellt fuer JSON definierte Tool Nodes. author Marcus Schlieper
- 2026-03-28: Layout fuer Tool Node Einbettung verbessert. author Marcus Schlieper
- 2026-04-04: Styling an Agent Designer angepasst mit Theme und Icons. author Marcus Schlieper
author Marcus Schlieper
*/

import { useMemo } from "react";
import { FiDatabase, FiTag } from "react-icons/fi";
import { TVariableType } from "../types/workflow";
import { use_workflow_store } from "../store/workflow_store";

interface IToolVariableSelectorProps {
  s_label: string;
  s_value: string;
  a_allowed_types?: TVariableType[];
  on_change: (s_value: string) => void;
}

function get_wrapper_style(): React.CSSProperties {
  return {
    flexDirection: "column",
    gap: "10px",
    height: "calc(100vh - 200px)",
    maxHeight: "calc(100vh - 200px)",
    minHeight: 0,
    overflow: "auto",
  };
}

function get_label_row_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--color_text)",
  };
}

function get_hint_style(): React.CSSProperties {
  return {
    fontSize: "11px",
    color: "var(--color_text_muted)",
    margin: 0,
  };
}

function get_select_style(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid var(--color_border)",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "12px",
    background: "var(--color_panel)",
    color: "var(--color_text)",
    outline: "none",
    appearance: "none",
  };
}

export function ToolVariableSelector({
  s_label,
  s_value,
  a_allowed_types,
  on_change,
}: IToolVariableSelectorProps): JSX.Element {
  const { global_variables } = use_workflow_store();

  const a_filtered_variables = useMemo(() => {
    if (!a_allowed_types || a_allowed_types.length === 0) {
      return global_variables;
    }
    return global_variables.filter((o_item) =>
      a_allowed_types.includes(o_item.s_type)
    );
  }, [global_variables, a_allowed_types]);

  return (
    <div style={get_wrapper_style()}>
      {s_label ? (
        <div style={get_label_row_style()}>
          <FiDatabase size={14} />
          <span>{s_label}</span>
        </div>
      ) : null}

      <select
        value={s_value}
        onChange={(o_event) => on_change(o_event.target.value)}
        style={get_select_style()}
      >
        <option value="">not_set</option>
        {a_filtered_variables.map((o_item) => (
          <option key={o_item.s_id} value={o_item.s_name}>
            {o_item.s_name} ({o_item.s_type})
          </option>
        ))}
      </select>

      <p style={get_hint_style()}>
        <FiTag size={11} style={{ marginRight: "4px", verticalAlign: "text-bottom" }} />
        {a_filtered_variables.length} Variable(n) verfuegbar
      </p>
    </div>
  );
}
