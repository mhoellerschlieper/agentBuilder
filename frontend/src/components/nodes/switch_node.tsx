/* file: frontend/src/components/nodes/switch_node.tsx
description: Darstellung des Switch Nodes mit kompaktem Design,
sichtbaren Handles und aufklappbaren Details.
history:
- 2026-04-03: Erstellt analog zum Condition Node fuer Switch mit Cases und Default Ausgang. author Marcus Schlieper
- 2026-04-06: Auf input_handles und output_handles mit sicheren Defaults umgestellt. author Marcus Schlieper
- 2026-04-06: Sichtbare kopierbare Handle Labels und Runtime Ergebnisanzeige ergaenzt. author Marcus Schlieper
- 2026-04-06: Bottom Outputs und Event Handles ergaenzt. author Marcus Schlieper
- 2026-04-06: Output Handles wieder rechts positioniert. author Marcus Schlieper
- 2026-04-11: Details einklappbar gemacht und Header Icon ergaenzt. author Marcus Schlieper
- 2026-04-12: Add case und dynamische Case Outputs rechts ergaenzt. author Marcus Schlieper
- 2026-04-13: Hover Infos und Runtime Werte an Handles integriert. author Marcus Schlieper
author Marcus Schlieper
*/

import React from "react";
import { NodeProps } from "@xyflow/react";
import { ISwitchNodeData } from "../../types/workflow";
import { NodeDeleteButton } from "../node_delete_button";
import { use_workflow_store } from "../../store/workflow_store";
import {
  THandleDefinition,
  NodeDetailsSection,
  NodeHeaderTitle,
  get_input_style,
  get_label_style,
  get_meta_style,
  get_node_body_style,
  get_node_header_style,
  get_node_wrapper_style,
  get_safe_handle_definitions,
  RenderEventHandles,
  RenderNamedHandles,
  RenderRuntimeResult,
} from "./node_runtime_helpers";

type TSwitchCaseItem = {
  s_id?: string;
  s_value?: string;
};

function create_case_id(): string {
  return "case_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 100000));
}

function get_case_row_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "10px",
    backgroundColor: "#f8fafc",
  };
}

function get_button_style(s_variant: "primary" | "danger"): React.CSSProperties {
  return {
    border: "1px solid " + (s_variant === "danger" ? "#dc2626" : "#2563eb"),
    borderRadius: "10px",
    padding: "8px 10px",
    backgroundColor: s_variant === "danger" ? "#fef2f2" : "#eff6ff",
    color: s_variant === "danger" ? "#b91c1c" : "#1d4ed8",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  };
}

export function SwitchNode({ id, data }: NodeProps): JSX.Element {
  const o_data = (data as ISwitchNodeData) || ({} as ISwitchNodeData);
  const { update_node_data } = use_workflow_store();

  const a_cases = Array.isArray(o_data.cases) ? (o_data.cases as TSwitchCaseItem[]) : [];

  const a_input_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).input_handles,
    [
      {
        s_key: "input_main",
        s_label: "Pruefdaten",
        s_description: "Daten fuer die Auswahl",
      },
    ],
  );

  const a_case_output_handles: THandleDefinition[] = a_cases.map((o_case, i_index) => {
    const s_case_value =
      o_case && typeof o_case.s_value === "string" && o_case.s_value.trim() !== ""
        ? o_case.s_value.trim()
        : "case_" + String(i_index + 1);

    return {
      s_key: "case_" + String(i_index + 1),
      s_label: s_case_value,
      s_description: "Ausgang fuer " + s_case_value,
    };
  });

  const a_output_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).output_handles,
    [
      ...a_case_output_handles,
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
    ],
  );

  const s_if_left = typeof o_data.s_if_left === "string" ? o_data.s_if_left : "";
  const s_default = typeof o_data.s_default === "string" ? o_data.s_default : "";

  function sync_case_output_handles(a_next_cases: TSwitchCaseItem[]): void {
    const a_next_output_handles: THandleDefinition[] = a_next_cases.map((o_case, i_index) => {
      const s_case_value =
        typeof o_case.s_value === "string" && o_case.s_value.trim() !== ""
          ? o_case.s_value.trim()
          : "case_" + String(i_index + 1);

      return {
        s_key: "case_" + String(i_index + 1),
        s_label: s_case_value,
        s_description: "Ausgang fuer " + s_case_value,
      };
    });

    a_next_output_handles.push({
      s_key: "default",
      s_label: "default",
      s_description: "Standard Ausgang",
    });

    a_next_output_handles.push({
      s_key: "output_main",
      s_label: "Ergebnis",
      s_description: "Standard Ergebnis",
    });

    update_node_data(id, {
      cases: a_next_cases,
      output_handles: a_next_output_handles,
    });
  }

  function on_add_case(): void {
    sync_case_output_handles([
      ...a_cases,
      {
        s_id: create_case_id(),
        s_value: "",
      },
    ]);
  }

  function on_delete_case(i_index: number): void {
    if (i_index < 0 || i_index >= a_cases.length) {
      return;
    }

    sync_case_output_handles(
      a_cases.filter((_o_item, i_current_index) => i_current_index !== i_index),
    );
  }

  function on_update_case_value(i_index: number, s_value: string): void {
    const a_next_cases = [...a_cases];
    const o_current_case =
      a_next_cases[i_index] && typeof a_next_cases[i_index] === "object"
        ? { ...(a_next_cases[i_index] as TSwitchCaseItem) }
        : { s_id: create_case_id() };

    o_current_case.s_value = s_value;

    if (
      typeof o_current_case.s_id !== "string" ||
      o_current_case.s_id.trim() === ""
    ) {
      o_current_case.s_id = create_case_id();
    }

    a_next_cases[i_index] = o_current_case;
    sync_case_output_handles(a_next_cases);
  }

  return (
    <div style={get_node_wrapper_style()}>
      <RenderNamedHandles
        a_handles={a_input_handles}
        s_type="target"
        o_data={(o_data as Record<string, unknown>) || {}}
      />
      <RenderNamedHandles
        a_handles={a_output_handles}
        s_type="source"
        o_data={(o_data as Record<string, unknown>) || {}}
      />
      <RenderEventHandles o_data={(o_data as Record<string, unknown>) || {}} />

      <div style={get_node_header_style("rgba(249, 115, 22, 0.18)", "rgba(249, 115, 22, 0.34)")}>
        <NodeHeaderTitle
          s_kind="switch"
          s_title="Switch"
          s_subtitle={"if left - " + String(a_cases.length) + " cases"}
        />
        <NodeDeleteButton node_id={id} />
      </div>

      <div style={get_node_body_style()}>
        <div style={get_meta_style()}>
          if left - {a_cases.length} cases - 1 default
        </div>

        <NodeDetailsSection s_title="Switch settings" s_meta="cases" b_default_open={false}>
          <label>
            <span style={get_label_style()}>if left</span>
            <input
              value={s_if_left}
              onChange={(o_event) => {
                update_node_data(id, { s_if_left: o_event.target.value });
              }}
              style={get_input_style()}
            />
          </label>

          {a_cases.length > 0 ? (
            a_cases.map((o_case, i_index) => {
              const s_case_value =
                o_case && typeof o_case.s_value === "string"
                  ? o_case.s_value
                  : "";

              return (
                <div key={o_case.s_id || "case_" + String(i_index)} style={get_case_row_style()}>
                  <label>
                    <span style={get_label_style()}>{"case" + String(i_index + 1)}</span>
                    <input
                      value={s_case_value}
                      onChange={(o_event) => {
                        on_update_case_value(i_index, o_event.target.value);
                      }}
                      style={get_input_style()}
                    />
                  </label>

                  <div style={get_meta_style()}>
                    output handle: case_{String(i_index + 1)}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      on_delete_case(i_index);
                    }}
                    style={get_button_style("danger")}
                  >
                    Delete Case
                  </button>
                </div>
              );
            })
          ) : (
            <div style={get_meta_style()}>No cases</div>
          )}

          <button
            type="button"
            onClick={() => {
              on_add_case();
            }}
            style={get_button_style("primary")}
          >
            Add Case
          </button>

          <label>
            <span style={get_label_style()}>default</span>
            <input
              value={s_default}
              onChange={(o_event) => {
                update_node_data(id, { s_default: o_event.target.value });
              }}
              style={get_input_style()}
            />
          </label>
        </NodeDetailsSection>

        <RenderRuntimeResult o_data={(o_data as Record<string, unknown>) || {}} />
      </div>
    </div>
  );
}
