/* file: frontend/src/components/nodes/condition_node.tsx
description: Darstellung des Condition Nodes mit kompaktem Design,
sichtbaren Handles und aufklappbaren Details.
history:
- 2026-03-25: Erstellt fuer xyflow Condition Node. author Marcus Schlieper
- 2026-03-27: Erweitert um Delete Button. author Marcus Schlieper
- 2026-03-27: Erweitert um Inline Eingaben im Node. author Marcus Schlieper
- 2026-04-06: Auf input_handles und output_handles mit sicheren Defaults umgestellt. author Marcus Schlieper
- 2026-04-06: Sichtbare kopierbare Handle Labels und Runtime Ergebnisanzeige ergaenzt. author Marcus Schlieper
- 2026-04-06: Then und else Ausgaenge sowie Event Handles unten ergaenzt. author Marcus Schlieper
- 2026-04-06: Output Handles wieder rechts positioniert. author Marcus Schlieper
- 2026-04-06: Eingabefelder auf if_left, operator, if_right, Add Rule und Delete Rule angepasst. author Marcus Schlieper
- 2026-04-11: Details einklappbar gemacht und Header Icon ergaenzt. author Marcus Schlieper
- 2026-04-13: Hover Infos und Runtime Werte an Handles integriert. author Marcus Schlieper
author Marcus Schlieper
*/
import React from "react";
import { NodeProps } from "@xyflow/react";
import { IConditionNodeData } from "../../types/workflow";
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

function create_rule_id(): string {
  return "rule_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 100000));
}

function get_rule_box_style(): React.CSSProperties {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "10px",
    backgroundColor: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
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

export function ConditionNode({ id, data }: NodeProps): JSX.Element {
  const o_data = (data as IConditionNodeData) || ({} as IConditionNodeData);
  const { update_node_data } = use_workflow_store();

  const a_rules = Array.isArray((o_data as Record<string, unknown>).rules)
    ? (((o_data as Record<string, unknown>).rules as unknown[]) || [])
    : [];

  const a_input_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).input_handles,
    [
      {
        s_key: "input_main",
        s_label: "Pruefdaten",
        s_description: "Daten fuer die Bedingung",
      },
    ],
  );

  const a_output_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).output_handles,
    [
      {
        s_key: "true",
        s_label: "true",
        s_description: "Pfad fuer wahr",
      },
      {
        s_key: "false",
        s_label: "false",
        s_description: "Pfad fuer falsch",
      },
      {
        s_key: "output_main",
        s_label: "Ergebnis",
        s_description: "Auswertung der Bedingung",
      },
    ],
  );

  function update_rule_field(i_index: number, s_key: string, value: string): void {
    const a_next_rules = [...a_rules];
    const o_rule =
      a_next_rules[i_index] && typeof a_next_rules[i_index] === "object"
        ? { ...(a_next_rules[i_index] as Record<string, unknown>) }
        : {};

    o_rule[s_key] = value;

    if (typeof o_rule.s_id !== "string" || o_rule.s_id.trim() === "") {
      o_rule.s_id = create_rule_id();
    }

    a_next_rules[i_index] = o_rule;
    update_node_data(id, { rules: a_next_rules });
  }

  function on_add_rule(): void {
    const a_next_rules = [...a_rules];
    a_next_rules.push({
      s_id: create_rule_id(),
      if_left: "",
      operator: "equals",
      if_right: "",
    });
    update_node_data(id, { rules: a_next_rules });
  }

  function on_delete_rule(i_index: number): void {
    if (i_index < 0 || i_index >= a_rules.length) {
      return;
    }

    update_node_data(id, {
      rules: a_rules.filter((_o_item, i_current_index) => i_current_index !== i_index),
    });
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

      <div style={get_node_header_style("rgba(245, 158, 11, 0.18)", "rgba(245, 158, 11, 0.34)")}>
        <NodeHeaderTitle
          s_kind="condition"
          s_title="Condition"
          s_subtitle={"If - " + String(a_rules.length) + " rules"}
        />
        <NodeDeleteButton node_id={id} />
      </div>

      <div style={get_node_body_style()}>
        <div style={get_meta_style()}>
          If - {a_rules.length} rules
        </div>

        <NodeDetailsSection s_title="Rules" s_meta={String(a_rules.length)} b_default_open={false}>
          {a_rules.length === 0 ? (
            <div style={get_meta_style()}>No rules</div>
          ) : (
            a_rules.map((o_rule_unknown, i_index) => {
              const o_rule =
                o_rule_unknown && typeof o_rule_unknown === "object"
                  ? (o_rule_unknown as Record<string, unknown>)
                  : {};

              const s_if_left =
                typeof o_rule.if_left === "string"
                  ? o_rule.if_left
                  : typeof o_rule.s_if_left === "string"
                    ? (o_rule.s_if_left as string)
                    : "";

              const s_operator =
                typeof o_rule.operator === "string"
                  ? o_rule.operator
                  : typeof o_rule.s_operator === "string"
                    ? (o_rule.s_operator as string)
                    : "equals";

              const s_if_right =
                typeof o_rule.if_right === "string"
                  ? o_rule.if_right
                  : typeof o_rule.s_if_right === "string"
                    ? (o_rule.s_if_right as string)
                    : "";

              return (
                <div key={String(o_rule.s_id || "rule_" + i_index)} style={get_ruleBoxStyle()}>
                  <label>
                    <span style={get_label_style()}>if_left</span>
                    <input
                      value={s_if_left}
                      onChange={(o_event) => {
                        update_rule_field(i_index, "if_left", o_event.target.value);
                      }}
                      style={get_input_style()}
                    />
                  </label>

                  <label>
                    <span style={get_label_style()}>operator</span>
                    <select
                      value={s_operator}
                      onChange={(o_event) => {
                        update_rule_field(i_index, "operator", o_event.target.value);
                      }}
                      style={get_input_style()}
                    >
                      <option value="equals">equals</option>
                      <option value="not_equals">not_equals</option>
                      <option value="greater_than">greater_than</option>
                      <option value="greater_or_equals">greater_or_equals</option>
                      <option value="less_than">less_than</option>
                      <option value="less_or_equals">less_or_equals</option>
                      <option value="contains">contains</option>
                      <option value="not_contains">not_contains</option>
                      <option value="starts_with">starts_with</option>
                      <option value="ends_with">ends_with</option>
                      <option value="is_empty">is_empty</option>
                      <option value="is_not_empty">is_not_empty</option>
                    </select>
                  </label>

                  <label>
                    <span style={get_label_style()}>if_right</span>
                    <input
                      value={s_if_right}
                      onChange={(o_event) => {
                        update_rule_field(i_index, "if_right", o_event.target.value);
                      }}
                      style={get_input_style()}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      on_delete_rule(i_index);
                    }}
                    style={get_button_style("danger")}
                  >
                    Delete Rule
                  </button>
                </div>
              );
            })
          )}

          <button
            type="button"
            onClick={() => {
              on_add_rule();
            }}
            style={get_button_style("primary")}
          >
            Add Rule
          </button>
        </NodeDetailsSection>

        <RenderRuntimeResult o_data={(o_data as Record<string, unknown>) || {}} />
      </div>
    </div>
  );
}

function get_ruleBoxStyle(): React.CSSProperties {
  return get_rule_box_style();
}
