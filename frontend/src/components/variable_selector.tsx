/* file: frontend/src/components/variable_selector.tsx */
/* description:
   Auswahlkomponente fuer Workflow Variablen mit optionaler Typfilterung.
   Stabil gegen fehlende oder ungueltige a_allowed_types.
*/
/* history:
- 2026-03-25: Erstellt fuer Variablenauswahl in Node Properties. author Marcus Schlieper
- 2026-04-03: Absicherung fuer optionale a_allowed_types ergaenzt. author Marcus Schlieper
*/

import React, { useMemo } from "react";
import { use_workflow_store } from "../store/workflow_store";
import { TVariableType } from "../types/workflow";

type TVariableSelectorProps = {
  s_value: string;
  on_change: (s_value: string) => void;
  a_allowed_types?: TVariableType[] | string[];
  s_placeholder?: string;
  b_allow_empty?: boolean;
};

function get_select_style(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "9px 10px",
    fontSize: "13px",
    color: "#111827",
    backgroundColor: "#ffffff",
    outline: "none",
  };
}

function get_hint_style(): React.CSSProperties {
  return {
    marginTop: "6px",
    fontSize: "12px",
    color: "#6b7280",
  };
}

type TVariableLike = {
  s_name?: string;
  s_type?: string;
};

export function VariableSelector(
  o_props: TVariableSelectorProps
): JSX.Element {
  const {
    s_value,
    on_change,
    a_allowed_types = [],
    s_placeholder = "Variable auswaehlen",
    b_allow_empty = true,
  } = o_props;

  const o_store = use_workflow_store() as Record<string, unknown>;

  const a_global_variables = Array.isArray(o_store["global_variables"])
    ? (o_store["global_variables"] as TVariableLike[])
    : [];

  const get_selected_node = o_store["get_selected_node"];
  const o_selected_node =
    typeof get_selected_node === "function"
      ? (get_selected_node as () => unknown)()
      : undefined;

  const a_node_variables = useMemo((): TVariableLike[] => {
    if (!o_selected_node || typeof o_selected_node !== "object") {
      return [];
    }

    const o_node = o_selected_node as {
      data?: {
        inputs?: TVariableLike[];
        outputs?: TVariableLike[];
      };
    };

    const a_inputs = Array.isArray(o_node.data?.inputs) ? o_node.data.inputs : [];
    const a_outputs = Array.isArray(o_node.data?.outputs)
      ? o_node.data.outputs
      : [];

    return [...a_inputs, ...a_outputs];
  }, [o_selected_node]);

  const a_safe_allowed_types = Array.isArray(a_allowed_types)
    ? a_allowed_types.filter(
        (s_type): s_type is string =>
          typeof s_type === "string" && s_type.trim() !== ""
      )
    : [];

  const a_all_variables = useMemo((): TVariableLike[] => {
    const a_combined = [...a_global_variables, ...a_node_variables];
    const o_seen = new Set<string>();

    return a_combined.filter((o_variable) => {
      const s_name =
        typeof o_variable?.s_name === "string" ? o_variable.s_name.trim() : "";
      if (s_name === "" || o_seen.has(s_name)) {
        return false;
      }
      o_seen.add(s_name);
      return true;
    });
  }, [a_global_variables, a_node_variables]);

  const a_filtered = useMemo((): TVariableLike[] => {
    return a_all_variables.filter((o_variable) => {
      const s_type =
        typeof o_variable?.s_type === "string" ? o_variable.s_type : "";
      return (
        a_safe_allowed_types.length === 0 ||
        a_safe_allowed_types.includes(s_type)
      );
    });
  }, [a_all_variables, a_safe_allowed_types]);

  return (
    <div>
      <select
        value={s_value ?? ""}
        onChange={(o_event) => on_change(o_event.target.value)}
        style={get_select_style()}
      >
        {b_allow_empty && <option value="">{s_placeholder}</option>}

        {a_filtered.map((o_variable) => {
          const s_name =
            typeof o_variable.s_name === "string" ? o_variable.s_name : "";
          const s_type =
            typeof o_variable.s_type === "string" ? o_variable.s_type : "";

          return (
            <option key={s_name} value={s_name}>
              {s_type ? `${s_name} (${s_type})` : s_name}
            </option>
          );
        })}
      </select>

      {a_filtered.length === 0 && (
        <div style={get_hint_style()}>
          Keine passenden Variablen vorhanden.
        </div>
      )}
    </div>
  );
}
