/* file: frontend/src/components/properties_panel.tsx
 * description: Kompaktes und elegantes Properties Panel mit stabilem Scroll Verhalten.
 * history:
 * - 2026-03-25: Erstellt fuer konfigurierbare Parameter pro Node. author Marcus Schlieper
 * - 2026-03-27: Vollstaendig konsolidiert fuer alle Node Typen. author Marcus Schlieper
 * - 2026-03-28: Ueberarbeitet fuer sauberes Layout, klare Abstaende und stabile Tool Felder. author Marcus Schlieper
 * - 2026-04-03: Switch Node Eigenschaften ergaenzt. author Marcus Schlieper
 * - 2026-04-03: Code Node Eigenschaften mit Python Code, Eingaben und Ausgaben ergaenzt. author Marcus Schlieper
 * - 2026-04-04: Styling an Agent Designer angepasst mit Theme, Icons, Cards und einheitlichen Eingaben. author Marcus Schlieper
 * - 2026-04-04: Theme Anzeige aus agent_designer.tsx integriert. author OpenAI
 * - 2026-04-06: Event Handle Sichtbarkeit fuer onBegin, onChange, onEnd und onError ergaenzt. author Marcus Schlieper
 * - 2026-04-06: LLM Zusatz Handles useTool und useMemory als Checkboxen ergaenzt. author Marcus Schlieper
 * - 2026-04-11: Sehr kompaktes Layout mit kleinerem Margin und Padding umgesetzt. author Marcus Schlieper
 * - 2026-04-11: Scrollbereich fuer das Workspace Panel stabilisiert. author Marcus Schlieper
 * - 2026-04-12: Classifier Node im Properties Panel ergaenzt. author Marcus Schlieper
 * author Marcus Schlieper
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  FiBox,
  FiCode,
  FiFlag,
  FiGitBranch,
  FiGlobe,
  FiLayers,
  FiCpu,
  FiMessageCircle,
  FiMoon,
  FiPlay,
  FiShuffle,
  FiSliders,
  FiSun,
  FiTool,
} from "react-icons/fi";
import {
  IClassifierNodeData,
  ICodeNodeData,
  ICommentNodeData,
  IConditionNodeData,
  IEndNodeData,
  IShowNodeData,
  IHttpNodeData,
  ILoopForNodeData,
  ILlmNodeData,
  IStartNodeData,
  ISwitchNodeData,
} from "../types/workflow";
import { use_workflow_store } from "../store/workflow_store";
import { use_tool_registry_store } from "../store/tool_registry_store";
import { ToolVariableSelector } from "./tool_variable_selector";
import {
  IToolFieldDefinition,
  IToolNodeData,
} from "../types/tool_registry";

const a_openai_model_options: string[] = [
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o",
  "gpt-4o-mini",
  "o4-mini",
  "o3",
  "o3-mini",
];

function get_panel_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    height: "calc(100vh - 200px)",
    maxHeight: "calc(100vh - 200px)",
    minHeight: 0,
    overflow: "auto",
  };
}

function get_card_style(): React.CSSProperties {
  return {
    border: "1px solid var(--color_border)",
    borderRadius: "10px",
    background: "var(--color_panel_elevated)",
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
  };
}

function get_card_header_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "8px 9px",
    borderBottom: "1px solid var(--color_border)",
    background: "var(--color_panel)",
  };
}

function get_card_icon_style(): React.CSSProperties {
  return {
    width: "26px",
    height: "26px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--color_accent_soft)",
    color: "var(--color_accent_text)",
    flexShrink: 0,
  };
}

function get_card_body_style(): React.CSSProperties {
  return {
    padding: "8px 9px",
  };
}

function get_title_style(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "12px",
    fontWeight: 800,
    color: "var(--color_text)",
    lineHeight: 1.2,
  };
}

function get_text_style(): React.CSSProperties {
  return {
    margin: "2px 0 0 0",
    fontSize: "10px",
    lineHeight: 1.35,
    color: "var(--color_text_muted)",
  };
}

function get_field_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginBottom: "7px",
  };
}

function get_label_style(): React.CSSProperties {
  return {
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--color_text)",
    lineHeight: 1.2,
  };
}

function get_input_style(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid var(--color_border)",
    borderRadius: "8px",
    padding: "7px 9px",
    fontSize: "12px",
    color: "var(--color_text)",
    background: "var(--color_panel)",
    outline: "none",
    minHeight: "32px",
  };
}

function get_textarea_style(): React.CSSProperties {
  return {
    ...get_input_style(),
    resize: "vertical",
    minHeight: "64px",
    fontFamily: "inherit",
  };
}

function get_code_textarea_style(
  s_theme_mode: "light" | "dark",
): React.CSSProperties {
  if (s_theme_mode === "dark") {
    return {
      ...get_input_style(),
      resize: "vertical",
      minHeight: "160px",
      fontFamily: "monospace",
      whiteSpace: "pre",
      background: "#0f172a",
      color: "#e5e7eb",
      border: "1px solid #334155",
    };
  }

  return {
    ...get_input_style(),
    resize: "vertical",
    minHeight: "160px",
    fontFamily: "monospace",
    whiteSpace: "pre",
    background: "#f8fafc",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
  };
}

function get_button_style(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid var(--color_accent)",
    borderRadius: "8px",
    background: "var(--color_accent_soft)",
    color: "var(--color_accent_text)",
    padding: "6px 9px",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function get_item_card_style(): React.CSSProperties {
  return {
    border: "1px solid var(--color_border)",
    borderRadius: "9px",
    background: "var(--color_panel)",
    padding: "8px",
    marginBottom: "7px",
  };
}

function get_muted_style(): React.CSSProperties {
  return {
    fontSize: "10px",
    color: "var(--color_text_muted)",
    margin: 0,
    lineHeight: 1.35,
  };
}

function get_checkbox_row_style(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    padding: "7px 9px",
    border: "1px solid var(--color_border)",
    borderRadius: "8px",
    background: "var(--color_panel)",
    marginBottom: "6px",
  };
}

function get_current_theme(): "light" | "dark" {
  const s_attr = document.documentElement.getAttribute("data-theme");
  return s_attr === "dark" ? "dark" : "light";
}

function get_node_icon(s_type: string): JSX.Element {
  switch (s_type) {
    case "comment":
      return <FiMessageCircle />;
    case "start":
      return <FiPlay />;
    case "http":
      return <FiGlobe />;
    case "condition":
      return <FiGitBranch />;
    case "switch":
      return <FiShuffle />;
    case "code":
      return <FiCode />;
    case "loop_for":
      return <FiLayers />;
    case "llm":
      return <FiCpu />;
    case "classifier":
      return <FiSliders />;
    case "end":
      return <FiFlag />;
    case "group":
      return <FiBox />;
    default:
      if (s_type.startsWith("tool_")) {
        return <FiTool />;
      }
      return <FiBox />;
  }
}

function SectionCard({
  Icon,
  s_title,
  s_text,
  children,
}: {
  Icon: React.ElementType;
  s_title: string;
  s_text?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div style={get_card_style()}>
      <div style={get_card_header_style()}>
        <div style={get_card_icon_style()}>
          <Icon />
        </div>

        <div>
          <h3 style={get_title_style()}>{s_title}</h3>
          {s_text ? <p style={get_text_style()}>{s_text}</p> : null}
        </div>
      </div>

      <div style={get_card_body_style()}>{children}</div>
    </div>
  );
}

function EventHandleProperties({
  o_data,
  on_change,
}: {
  o_data: Record<string, unknown>;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  return (
    <>
      <div style={get_checkbox_row_style()}>
        <label style={get_label_style()}>onBegin</label>
        <input
          type="checkbox"
          checked={Boolean(o_data.b_show_on_begin)}
          onChange={(o_event) =>
            on_change({ b_show_on_begin: o_event.target.checked })
          }
          title="Sichtbarkeit von onBegin"
        />
      </div>

      <div style={get_checkbox_row_style()}>
        <label style={get_label_style()}>onChange</label>
        <input
          type="checkbox"
          checked={Boolean(o_data.b_show_on_change)}
          onChange={(o_event) =>
            on_change({ b_show_on_change: o_event.target.checked })
          }
          title="Sichtbarkeit von onChange"
        />
      </div>

      <div style={get_checkbox_row_style()}>
        <label style={get_label_style()}>onEnd</label>
        <input
          type="checkbox"
          checked={Boolean(o_data.b_show_on_end)}
          onChange={(o_event) =>
            on_change({ b_show_on_end: o_event.target.checked })
          }
          title="Sichtbarkeit von onEnd"
        />
      </div>

      <div style={get_checkbox_row_style()}>
        <label style={get_label_style()}>onError</label>
        <input
          type="checkbox"
          checked={Boolean(o_data.b_show_on_error)}
          onChange={(o_event) =>
            on_change({ b_show_on_error: o_event.target.checked })
          }
          title="Sichtbarkeit von onError"
        />
      </div>
    </>
  );
}

function LlmSpecialHandleProperties({
  o_data,
  on_change,
}: {
  o_data: Record<string, unknown>;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  return (
    <>
      <div style={get_checkbox_row_style()}>
        <label style={get_label_style()}>useTool</label>
        <input
          type="checkbox"
          checked={Boolean(o_data.b_show_use_tool)}
          onChange={(o_event) =>
            on_change({ b_show_use_tool: o_event.target.checked })
          }
          title="Sichtbarkeit von useTool"
        />
      </div>

      <div style={get_checkbox_row_style()}>
        <label style={get_label_style()}>useMemory</label>
        <input
          type="checkbox"
          checked={Boolean(o_data.b_show_use_memory)}
          onChange={(o_event) =>
            on_change({ b_show_use_memory: o_event.target.checked })
          }
          title="Sichtbarkeit von useMemory"
        />
      </div>
    </>
  );
}

function ToolProperties({
  o_data,
  a_fields,
  s_description,
  on_change,
}: {
  o_data: IToolNodeData;
  a_fields: IToolFieldDefinition[];
  s_description: string;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  return (
    <>
      {s_description ? (
        <div style={get_field_style()}>
          <p style={get_muted_style()}>{s_description}</p>
        </div>
      ) : null}

      {a_fields.length === 0 ? (
        <p style={get_muted_style()}>tool_schema_missing</p>
      ) : (
        a_fields.map((o_field) => {
          const value = o_data?.[o_field.s_key as keyof IToolNodeData];

          if (o_field.s_field_type === "textarea") {
            return (
              <div key={o_field.s_key} style={get_field_style()}>
                <label style={get_label_style()}>
                  {o_field.s_label}
                  {o_field.b_required ? " *" : ""}
                </label>
                <textarea
                  value={typeof value === "string" ? value : ""}
                  onChange={(o_event) =>
                    on_change({ [o_field.s_key]: o_event.target.value })
                  }
                  rows={4}
                  style={get_textarea_style()}
                  title={o_field.s_label}
                />
              </div>
            );
          }

          if (o_field.s_field_type === "number") {
            return (
              <div key={o_field.s_key} style={get_field_style()}>
                <label style={get_label_style()}>
                  {o_field.s_label}
                  {o_field.b_required ? " *" : ""}
                </label>
                <input
                  type="number"
                  value={typeof value === "number" ? value : 0}
                  onChange={(o_event) =>
                    on_change({
                      [o_field.s_key]: Number(o_event.target.value) || 0,
                    })
                  }
                  style={get_input_style()}
                  title={o_field.s_label}
                />
              </div>
            );
          }

          if (o_field.s_field_type === "select") {
            return (
              <div key={o_field.s_key} style={get_field_style()}>
                <label style={get_label_style()}>
                  {o_field.s_label}
                  {o_field.b_required ? " *" : ""}
                </label>
                <select
                  value={typeof value === "string" ? value : ""}
                  onChange={(o_event) =>
                    on_change({ [o_field.s_key]: o_event.target.value })
                  }
                  style={get_input_style()}
                  title={o_field.s_label}
                >
                  <option value="">not_set</option>
                  {(o_field.a_options ?? []).map((o_option) => (
                    <option key={o_option.s_value} value={o_option.s_value}>
                      {o_option.s_label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (o_field.s_field_type === "checkbox") {
            return (
              <div key={o_field.s_key} style={get_field_style()}>
                <label style={get_label_style()}>
                  {o_field.s_label}
                  {o_field.b_required ? " *" : ""}
                </label>
                <select
                  value={String(Boolean(value))}
                  onChange={(o_event) =>
                    on_change({ [o_field.s_key]: o_event.target.value === "true" })
                  }
                  style={get_input_style()}
                  title={o_field.s_label}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </div>
            );
          }

          if (o_field.s_field_type === "variable_select") {
            return (
              <div key={o_field.s_key} style={get_field_style()}>
                <label style={get_label_style()}>
                  {o_field.s_label}
                  {o_field.b_required ? " *" : ""}
                </label>
                <ToolVariableSelector
                  s_value={typeof value === "string" ? value : ""}
                  on_change={(s_value) => on_change({ [o_field.s_key]: s_value })}
                />
              </div>
            );
          }

          return (
            <div key={o_field.s_key} style={get_field_style()}>
              <label style={get_label_style()}>
                {o_field.s_label}
                {o_field.b_required ? " *" : ""}
              </label>
              <input
                value={typeof value === "string" ? value : ""}
                onChange={(o_event) =>
                  on_change({ [o_field.s_key]: o_event.target.value })
                }
                style={get_input_style()}
                title={o_field.s_label}
              />
            </div>
          );
        })
      )}
    </>
  );
}

function CommentProperties({
  o_data,
  on_change,
}: {
  o_data: ICommentNodeData;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  return (
    <>
      <div style={get_field_style()}>
        <label style={get_label_style()}>Text</label>
        <textarea
          value={typeof o_data.s_text === "string" ? o_data.s_text : ""}
          onChange={(o_event) => on_change({ s_text: o_event.target.value })}
          rows={4}
          style={get_textarea_style()}
          title="Text"
        />
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>Color</label>
        <input
          value={typeof o_data.s_color === "string" ? o_data.s_color : ""}
          onChange={(o_event) => on_change({ s_color: o_event.target.value })}
          style={get_input_style()}
          title="Color"
        />
      </div>
    </>
  );
}

function StartProperties({
  o_data,
  on_change,
}: {
  o_data: IStartNodeData;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  type TStartOutputType = "string" | "int" | "float" | "array" | "object";
  type TStartOutputItem = {
    s_key: string;
    s_label: string;
    s_description: string;
    s_type: TStartOutputType;
    value: unknown;
  };

  function get_default_output_item(i_index: number): TStartOutputItem {
    const s_key = i_index === 0 ? "output_main" : "output_" + String(i_index + 1);
    const s_label = i_index === 0 ? "Startdaten" : "Output " + String(i_index + 1);

    return {
      s_key,
      s_label,
      s_description: "Daten des Start Nodes",
      s_type: "string",
      value: "",
    };
  }

  const a_outputs = Array.isArray((o_data as Record<string, unknown>).a_outputs)
    ? ((o_data as Record<string, unknown>).a_outputs as TStartOutputItem[])
    : [get_default_output_item(0)];

  function update_output(
    i_index: number,
    o_patch: Partial<TStartOutputItem>,
  ): void {
    const a_next = [...a_outputs];
    const o_current = a_next[i_index] || get_default_output_item(i_index);
    a_next[i_index] = {
      ...o_current,
      ...o_patch,
    };
    on_change({
      a_outputs: a_next,
    });
  }

  return (
    <>
      {a_outputs.map((o_item, i_index) => (
        <div key={o_item.s_key + "_" + String(i_index)} style={get_item_card_style()}>
          <div style={get_field_style()}>
            <label style={get_label_style()}>Output Label</label>
            <input
              value={o_item.s_label}
              onChange={(o_event) =>
                update_output(i_index, { s_label: o_event.target.value })
              }
              style={get_input_style()}
              title="Output Label"
            />
          </div>

          <div style={get_field_style()}>
            <label style={get_label_style()}>Output Key</label>
            <input
              value={o_item.s_key}
              onChange={(o_event) =>
                update_output(i_index, { s_key: o_event.target.value })
              }
              style={get_input_style()}
              title="Output Key"
            />
          </div>

          <div style={get_field_style()}>
            <label style={get_label_style()}>Typ</label>
            <select
              value={o_item.s_type}
              onChange={(o_event) =>
                update_output(i_index, {
                  s_type: o_event.target.value as TStartOutputType,
                })
              }
              style={get_input_style()}
              title="Typ"
            >
              <option value="string">String</option>
              <option value="int">Int</option>
              <option value="float">Float</option>
              <option value="array">Array</option>
              <option value="object">Object</option>
            </select>
          </div>

          <div style={get_field_style()}>
            <label style={get_label_style()}>Value</label>
            <textarea
              value={typeof o_item.value === "string" ? o_item.value : ""}
              onChange={(o_event) =>
                update_output(i_index, { value: o_event.target.value })
              }
              rows={3}
              spellCheck={false}
              style={get_textarea_style()}
              title="Value"
            />
          </div>
        </div>
      ))}

      <button
        onClick={() => {
          const a_next = [...a_outputs, get_default_output_item(a_outputs.length)];
          on_change({ a_outputs: a_next });
        }}
        style={get_button_style()}
        title="Add Output"
        type="button"
      >
        Add Output
      </button>
    </>
  );
}

function HttpProperties({
  o_data,
  on_change,
}: {
  o_data: IHttpNodeData;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  return (
    <>
      <div style={get_field_style()}>
        <label style={get_label_style()}>API</label>
        <input
          value={typeof o_data.s_api === "string" ? o_data.s_api : ""}
          onChange={(o_event) => on_change({ s_api: o_event.target.value })}
          style={get_input_style()}
          title="API"
        />
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>Method</label>
        <select
          value={typeof o_data.s_method === "string" ? o_data.s_method : "GET"}
          onChange={(o_event) => on_change({ s_method: o_event.target.value })}
          style={get_input_style()}
          title="Method"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>Body</label>
        <textarea
          value={typeof o_data.s_body === "string" ? o_data.s_body : ""}
          onChange={(o_event) => on_change({ s_body: o_event.target.value })}
          rows={4}
          style={get_textarea_style()}
          title="Body"
        />
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>Timeout</label>
        <input
          type="number"
          value={typeof o_data.i_timeout === "number" ? o_data.i_timeout : 0}
          onChange={(o_event) =>
            on_change({ i_timeout: Number(o_event.target.value) || 0 })
          }
          style={get_input_style()}
          title="Timeout"
        />
      </div>
    </>
  );
}

function ConditionProperties({
  o_data,
  on_change,
}: {
  o_data: IConditionNodeData;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  const a_rules = Array.isArray((o_data as Record<string, unknown>).rules)
    ? ((o_data as Record<string, unknown>).rules as Record<string, unknown>[])
    : [];

  function create_rule_id(): string {
    return "rule_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 100000));
  }

  return (
    <>
      {a_rules.map((o_rule, i_index) => {
        const s_if_left =
          typeof o_rule.if_left === "string" ? o_rule.if_left : "";
        const s_operator =
          typeof o_rule.operator === "string" ? o_rule.operator : "equals";
        const s_if_right =
          typeof o_rule.if_right === "string" ? o_rule.if_right : "";

        return (
          <div key={String(o_rule.s_id || i_index)} style={get_item_card_style()}>
            <div style={get_field_style()}>
              <label style={get_label_style()}>if_left</label>
              <input
                value={s_if_left}
                onChange={(o_event) => {
                  const a_next = [...a_rules];
                  a_next[i_index] = {
                    ...o_rule,
                    if_left: o_event.target.value,
                    s_id:
                      typeof o_rule.s_id === "string" && o_rule.s_id.trim() !== ""
                        ? o_rule.s_id
                        : create_rule_id(),
                  };
                  on_change({ rules: a_next });
                }}
                style={get_input_style()}
                title="if_left"
              />
            </div>

            <div style={get_field_style()}>
              <label style={get_label_style()}>operator</label>
              <select
                value={s_operator}
                onChange={(o_event) => {
                  const a_next = [...a_rules];
                  a_next[i_index] = {
                    ...o_rule,
                    operator: o_event.target.value,
                    s_id:
                      typeof o_rule.s_id === "string" && o_rule.s_id.trim() !== ""
                        ? o_rule.s_id
                        : create_rule_id(),
                  };
                  on_change({ rules: a_next });
                }}
                style={get_input_style()}
                title="operator"
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
            </div>

            <div style={get_field_style()}>
              <label style={get_label_style()}>if_right</label>
              <input
                value={s_if_right}
                onChange={(o_event) => {
                  const a_next = [...a_rules];
                  a_next[i_index] = {
                    ...o_rule,
                    if_right: o_event.target.value,
                    s_id:
                      typeof o_rule.s_id === "string" && o_rule.s_id.trim() !== ""
                        ? o_rule.s_id
                        : create_rule_id(),
                  };
                  on_change({ rules: a_next });
                }}
                style={get_input_style()}
                title="if_right"
              />
            </div>

            <button
              onClick={() => {
                const a_next = a_rules.filter(
                  (_o_item, i_current_index) => i_current_index !== i_index,
                );
                on_change({ rules: a_next });
              }}
              style={{
                ...get_button_style(),
                border: "1px solid #dc2626",
                color: "#b91c1c",
                background: "#fef2f2",
              }}
              title="Delete Rule"
              type="button"
            >
              Delete Rule
            </button>
          </div>
        );
      })}

      <button
        onClick={() => {
          on_change({
            rules: [
              ...a_rules,
              {
                s_id: create_rule_id(),
                if_left: "",
                operator: "equals",
                if_right: "",
              },
            ],
          });
        }}
        style={get_button_style()}
        title="Add Rule"
        type="button"
      >
        Add Rule
      </button>
    </>
  );
}

function SwitchProperties({
  o_data,
  on_change,
}: {
  o_data: ISwitchNodeData;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  function create_case_id(): string {
    return "case_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 100000));
  }

  const a_cases = Array.isArray(o_data.cases) ? o_data.cases : [];

  function build_output_handles(
    a_next_cases: Array<{ s_id?: string; s_value?: string }>,
  ): Array<{ s_key: string; s_label: string; s_description: string }> {
    const a_case_handles = a_next_cases.map((o_case, i_index) => {
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

    a_case_handles.push({
      s_key: "default",
      s_label: "default",
      s_description: "Standard Ausgang",
    });

    a_case_handles.push({
      s_key: "output_main",
      s_label: "Ergebnis",
      s_description: "Standard Ergebnis",
    });

    return a_case_handles;
  }

  return (
    <>
      <div style={get_field_style()}>
        <label style={get_label_style()}>if left</label>
        <input
          value={typeof o_data.s_if_left === "string" ? o_data.s_if_left : ""}
          onChange={(o_event) => on_change({ s_if_left: o_event.target.value })}
          style={get_input_style()}
          title="if left"
        />
      </div>

      {a_cases.map((o_case, i_index) => {
        const s_case_value =
          o_case && typeof o_case.s_value === "string" ? o_case.s_value : "";

        return (
          <div key={String(o_case.s_id || i_index)} style={get_item_card_style()}>
            <div style={get_field_style()}>
              <label style={get_label_style()}>
                {"case " + String(i_index + 1)}
              </label>
              <input
                value={s_case_value}
                onChange={(o_event) => {
                  const a_next_cases = [...a_cases];
                  const o_next_case =
                    a_next_cases[i_index] && typeof a_next_cases[i_index] === "object"
                      ? { ...(a_next_cases[i_index] as Record<string, unknown>) }
                      : { s_id: create_case_id() };

                  o_next_case.s_value = o_event.target.value;

                  if (
                    typeof o_next_case.s_id !== "string" ||
                    o_next_case.s_id.trim() === ""
                  ) {
                    o_next_case.s_id = create_case_id();
                  }

                  a_next_cases[i_index] = o_next_case as typeof a_cases[number];

                  on_change({
                    cases: a_next_cases,
                    output_handles: build_output_handles(
                      a_next_cases as Array<{ s_id?: string; s_value?: string }>,
                    ),
                  });
                }}
                style={get_input_style()}
                title={"case " + String(i_index + 1)}
              />
            </div>

            <p style={get_muted_style()}>
              {"Output Handle: case_" + String(i_index + 1)}
            </p>

            <button
              onClick={() => {
                const a_next_cases = a_cases.filter(
                  (_o_item, i_current_index) => i_current_index !== i_index,
                );

                on_change({
                  cases: a_next_cases,
                  output_handles: build_output_handles(
                    a_next_cases as Array<{ s_id?: string; s_value?: string }>,
                  ),
                });
              }}
              style={{
                ...get_button_style(),
                border: "1px solid #dc2626",
                color: "#b91c1c",
                background: "#fef2f2",
              }}
              title="Delete Case"
              type="button"
            >
              Delete Case
            </button>
          </div>
        );
      })}

      <button
        onClick={() => {
          const a_next_cases = [
            ...a_cases,
            {
              s_id: create_case_id(),
              s_value: "",
            },
          ];

          on_change({
            cases: a_next_cases,
            output_handles: build_output_handles(
              a_next_cases as Array<{ s_id?: string; s_value?: string }>,
            ),
          });
        }}
        style={get_button_style()}
        title="Add Case"
        type="button"
      >
        Add Case
      </button>

      <div style={get_field_style()}>
        <label style={get_label_style()}>default</label>
        <input
          value={typeof o_data.s_default === "string" ? o_data.s_default : ""}
          onChange={(o_event) => on_change({ s_default: o_event.target.value })}
          style={get_input_style()}
          title="default"
        />
      </div>
    </>
  );
}

function CodeProperties({
  o_data,
  on_change,
  o_code_textarea_style,
}: {
  o_data: ICodeNodeData;
  on_change: (o_patch: Record<string, unknown>) => void;
  o_code_textarea_style: React.CSSProperties;
}): JSX.Element {
  return (
    <div style={get_field_style()}>
      <label style={get_label_style()}>python_code</label>
      <textarea
        value={typeof o_data.s_python_code === "string" ? o_data.s_python_code : ""}
        onChange={(o_event) => on_change({ s_python_code: o_event.target.value })}
        rows={10}
        spellCheck={false}
        style={o_code_textarea_style}
        title="python_code"
      />
    </div>
  );
}

function LoopForProperties({
  o_data,
  on_change,
}: {
  o_data: ILoopForNodeData;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  return (
    <>
      <div style={get_field_style()}>
        <label style={get_label_style()}>source_array_variable</label>
        <input
          value={
            typeof o_data.s_source_array_variable === "string"
              ? o_data.s_source_array_variable
              : ""
          }
          onChange={(o_event) =>
            on_change({ s_source_array_variable: o_event.target.value })
          }
          style={get_input_style()}
          title="source_array_variable"
        />
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>item_variable</label>
        <input
          value={typeof o_data.s_item_variable === "string" ? o_data.s_item_variable : ""}
          onChange={(o_event) => on_change({ s_item_variable: o_event.target.value })}
          style={get_input_style()}
          title="item_variable"
        />
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>index_variable</label>
        <input
          value={
            typeof o_data.s_index_variable === "string" ? o_data.s_index_variable : ""
          }
          onChange={(o_event) =>
            on_change({ s_index_variable: o_event.target.value })
          }
          style={get_input_style()}
          title="index_variable"
        />
      </div>
    </>
  );
}

function LlmProperties({
  o_data,
  on_change,
}: {
  o_data: ILlmNodeData;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  const s_provider =
    typeof (o_data as Record<string, unknown>).s_provider === "string"
      ? ((o_data as Record<string, unknown>).s_provider as string)
      : "openai";

  return (
    <>
      <div style={get_field_style()}>
        <label style={get_label_style()}>provider</label>
        <select
          value={s_provider}
          onChange={(o_event) => on_change({ s_provider: o_event.target.value })}
          style={get_input_style()}
          title="provider"
        >
          <option value="openai">openai</option>
          <option value="endpoint">endpoint</option>
        </select>
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>modelName</label>
        <select
          value={typeof o_data.s_model_name === "string" ? o_data.s_model_name : ""}
          onChange={(o_event) => on_change({ s_model_name: o_event.target.value })}
          style={get_input_style()}
          title="modelName"
        >
          <option value="">not_set</option>
          {a_openai_model_options.map((s_item) => (
            <option key={s_item} value={s_item}>
              {s_item}
            </option>
          ))}
        </select>
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>temperature</label>
        <input
          type="number"
          step="0.1"
          value={typeof o_data.d_temperature === "number" ? o_data.d_temperature : 0}
          onChange={(o_event) =>
            on_change({ d_temperature: Number(o_event.target.value) || 0 })
          }
          style={get_input_style()}
          title="temperature"
        />
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>systemPrompt</label>
        <textarea
          value={typeof o_data.s_system_prompt === "string" ? o_data.s_system_prompt : ""}
          onChange={(o_event) =>
            on_change({ s_system_prompt: o_event.target.value })
          }
          rows={3}
          style={get_textarea_style()}
          title="systemPrompt"
        />
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>prompt</label>
        <textarea
          value={typeof o_data.s_prompt === "string" ? o_data.s_prompt : ""}
          onChange={(o_event) => on_change({ s_prompt: o_event.target.value })}
          rows={4}
          style={get_textarea_style()}
          title="prompt"
        />
      </div>
    </>
  );
}

function get_classifier_classes_scroll_style(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "260px",
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: "4px",
    minHeight: 0,
    marginBottom: "8px",
  };
}

function get_classifier_actions_style(): React.CSSProperties {
  return {
    position: "sticky",
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    paddingTop: "8px",
    background: "var(--color_panel_elevated)",
    zIndex: 1,
  };
}

function ClassifierProperties({
  o_data,
  on_change,
}: {
  o_data: IClassifierNodeData;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  function create_class_id(): string {
    return (
      "class_" +
      String(Date.now()) +
      "_" +
      String(Math.floor(Math.random() * 100000))
    );
  }

  function clamp_temperature(d_value: number): number {
    if (!Number.isFinite(d_value)) {
      return 0;
    }
    if (d_value < 0) {
      return 0;
    }
    if (d_value > 2) {
      return 2;
    }
    return d_value;
  }

  const a_classes = Array.isArray(o_data.classes) ? o_data.classes : [];

  function build_output_handles(
    a_next_classes: Array<{
      s_id?: string;
      s_label?: string;
      s_description?: string;
    }>,
  ): Array<{
    s_key: string;
    s_label: string;
    s_description: string;
  }> {
    const a_case_handles = a_next_classes.map((o_class, i_index) => {
      const s_label =
        typeof o_class.s_label === "string" && o_class.s_label.trim() !== ""
          ? o_class.s_label.trim()
          : "class_" + String(i_index + 1);

      return {
        s_key: "class_" + String(i_index + 1),
        s_label,
        s_description: "Ausgang fuer Klasse " + s_label,
      };
    });

    a_case_handles.push({
      s_key: "default",
      s_label: "default",
      s_description: "Fallback Ausgang",
    });

    a_case_handles.push({
      s_key: "output_main",
      s_label: "Ergebnis",
      s_description: "Classifier Ergebnis",
    });

    return a_case_handles;
  }

  return (
    <>
      <div style={get_field_style()}>
        <label style={get_label_style()}>provider</label>
        <select
          value={o_data.s_provider ?? "openai"}
          onChange={(o_event) => on_change({ s_provider: o_event.target.value })}
          style={get_input_style()}
          title="provider"
        >
          <option value="openai">openai</option>
          <option value="endpoint">endpoint</option>
        </select>
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>modelName</label>
        <select
          value={o_data.s_model_name ?? ""}
          onChange={(o_event) => on_change({ s_model_name: o_event.target.value })}
          style={get_input_style()}
          title="modelName"
        >
          <option value="">not_set</option>
          {a_openai_model_options.map((s_item) => (
            <option key={s_item} value={s_item}>
              {s_item}
            </option>
          ))}
        </select>
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>temperature</label>
        <input
          type="number"
          min={0}
          max={2}
          step={0.1}
          value={typeof o_data.d_temperature === "number" ? o_data.d_temperature : 0}
          onChange={(o_event) =>
            on_change({
              d_temperature: clamp_temperature(Number(o_event.target.value)),
            })
          }
          style={get_input_style()}
          title="temperature"
        />
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>systemPrompt</label>
        <textarea
          value={o_data.s_system_prompt ?? ""}
          onChange={(o_event) =>
            on_change({ s_system_prompt: o_event.target.value })
          }
          rows={3}
          style={get_textarea_style()}
          title="systemPrompt"
        />
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>prompt</label>
        <textarea
          value={o_data.s_prompt ?? ""}
          onChange={(o_event) => on_change({ s_prompt: o_event.target.value })}
          rows={4}
          style={get_textarea_style()}
          title="prompt"
        />
      </div>

      <div style={get_classifier_classes_scroll_style()}>
        {a_classes.length === 0 ? (
          <p style={get_muted_style()}>No classes</p>
        ) : null}

        {a_classes.map((o_class, i_index) => (
          <div key={o_class.s_id ?? "class_" + String(i_index)} style={get_item_card_style()}>
            <div style={get_field_style()}>
              <label style={get_label_style()}>
                {"class " + String(i_index + 1)}
              </label>
              <input
                value={typeof o_class.s_label === "string" ? o_class.s_label : ""}
                onChange={(o_event) => {
                  const a_next_classes = [...a_classes];
                  a_next_classes[i_index] = {
                    ...o_class,
                    s_id:
                      typeof o_class.s_id === "string" && o_class.s_id.trim() !== ""
                        ? o_class.s_id
                        : create_class_id(),
                    s_label: o_event.target.value,
                  };
                  on_change({
                    classes: a_next_classes,
                    output_handles: build_output_handles(a_next_classes),
                  });
                }}
                style={get_input_style()}
                title={"class " + String(i_index + 1)}
              />
            </div>

            <div style={get_field_style()}>
              <label style={get_label_style()}>description</label>
              <textarea
                value={
                  typeof o_class.s_description === "string"
                    ? o_class.s_description
                    : ""
                }
                onChange={(o_event) => {
                  const a_next_classes = [...a_classes];
                  a_next_classes[i_index] = {
                    ...o_class,
                    s_id:
                      typeof o_class.s_id === "string" && o_class.s_id.trim() !== ""
                        ? o_class.s_id
                        : create_class_id(),
                    s_description: o_event.target.value,
                  };
                  on_change({
                    classes: a_next_classes,
                    output_handles: build_output_handles(a_next_classes),
                  });
                }}
                rows={3}
                style={get_textarea_style()}
                title="description"
              />
            </div>

            <p style={get_muted_style()}>
              {"Output Handle: class_" + String(i_index + 1)}
            </p>

            <button
              onClick={() => {
                const a_next_classes = a_classes.filter(
                  (_o_item, i_current_index) => i_current_index !== i_index,
                );
                on_change({
                  classes: a_next_classes,
                  output_handles: build_output_handles(a_next_classes),
                });
              }}
              style={{
                ...get_button_style(),
                border: "1px solid #dc2626",
                color: "#b91c1c",
                background: "#fef2f2",
              }}
              title="Delete Class"
              type="button"
            >
              Delete Class
            </button>
          </div>
        ))}
      </div>

      <div style={get_classifier_actions_style()}>
        <button
          onClick={() => {
            const a_next_classes = [
              ...a_classes,
              {
                s_id: create_class_id(),
                s_label: "",
                s_description: "",
              },
            ];
            on_change({
              classes: a_next_classes,
              output_handles: build_output_handles(a_next_classes),
            });
          }}
          style={get_button_style()}
          title="Add Class"
          type="button"
        >
          Add Class
        </button>
      </div>
    </>
  );
}

function EndProperties({
  o_data,
  on_change,
}: {
  o_data: IEndNodeData;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  const s_result =
    typeof (o_data as Record<string, unknown>).s_result === "string"
      ? ((o_data as Record<string, unknown>).s_result as string)
      : typeof o_data.s_query === "string"
        ? o_data.s_query
        : "{{input:input_main.value}}";

  return (
    <>
      <div style={get_field_style()}>
        <label style={get_label_style()}>success</label>
        <select
          value={String(Boolean(o_data.b_success))}
          onChange={(o_event) =>
            on_change({ b_success: o_event.target.value === "true" })
          }
          style={get_input_style()}
          title="success"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>result</label>
        <textarea
          value={s_result}
          onChange={(o_event) =>
            on_change({
              s_result: o_event.target.value,
              s_query: o_event.target.value,
            })
          }
          rows={3}
          style={get_textarea_style()}
          title="result"
        />
      </div>
    </>
  );
}


function ShowProperties({
  o_data,
  on_change,
}: {
  o_data: IShowNodeData;
  on_change: (o_patch: Record<string, unknown>) => void;
}): JSX.Element {
  const s_result =
    typeof (o_data as Record<string, unknown>).s_result === "string"
      ? ((o_data as Record<string, unknown>).s_result as string)
      : typeof o_data.s_query === "string"
        ? o_data.s_query
        : "{{input:input_main.value}}";

  return (
    <>
      <div style={get_field_style()}>
        <label style={get_label_style()}>success</label>
        <select
          value={String(Boolean(o_data.b_success))}
          onChange={(o_event) =>
            on_change({ b_success: o_event.target.value === "true" })
          }
          style={get_input_style()}
          title="success"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>

      <div style={get_field_style()}>
        <label style={get_label_style()}>result</label>
        <textarea
          value={s_result}
          onChange={(o_event) =>
            on_change({
              s_result: o_event.target.value,
              s_query: o_event.target.value,
            })
          }
          rows={3}
          style={get_textarea_style()}
          title="result"
        />
      </div>
    </>
  );
}

export function PropertiesPanel(): JSX.Element {
  const { get_selected_node, update_node_data } = use_workflow_store();
  const { get_tool_schema_by_type } = use_tool_registry_store();
  const o_node = get_selected_node();

  const [s_theme_mode, set_theme_mode] = useState<"light" | "dark">(
    get_current_theme(),
  );

  useEffect(() => {
    function sync_theme(): void {
      set_theme_mode(get_current_theme());
    }

    sync_theme();

    const o_observer = new MutationObserver(() => {
      sync_theme();
    });

    o_observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("focus", sync_theme);

    return () => {
      o_observer.disconnect();
      window.removeEventListener("focus", sync_theme);
    };
  }, []);

  const o_code_textarea_style = useMemo(() => {
    return get_code_textarea_style(s_theme_mode);
  }, [s_theme_mode]);

  if (!o_node) {
    return (
      <div style={get_panel_style()}>
        <SectionCard
          Icon={FiMoon}
          s_title="No selection"
          s_text="Bitte eine Node auswaehlen"
        >
          <div style={get_checkbox_row_style()}>
            <label style={get_label_style()}>Aktives Theme</label>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {s_theme_mode === "dark" ? <FiMoon /> : <FiSun />}
              <span style={get_muted_style()}>{s_theme_mode}</span>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  function update_patch(o_patch: Record<string, unknown>): void {
    update_node_data(o_node.id, o_patch);
  }

  const o_tool_data = o_node.data as IToolNodeData;
  const o_tool_schema = o_node.type.startsWith("tool_")
    ? get_tool_schema_by_type(
        typeof o_tool_data?.s_tool_type === "string" && o_tool_data.s_tool_type
          ? o_tool_data.s_tool_type
          : String(o_node.type),
      )
    : undefined;

  return (
    <div style={get_panel_style()}>
      <SectionCard
        Icon={() => get_node_icon(String(o_node.type))}
        s_title="Properties"
        s_text={`Node Type: ${String(o_node.type)}`}
      >
        <div style={get_field_style()}>
          <label style={get_label_style()}>Label</label>
          <input
            value={((o_node.data as Record<string, unknown>)?.s_label as string) ?? ""}
            onChange={(o_event) => update_patch({ s_label: o_event.target.value })}
            style={get_input_style()}
            title="Label"
          />
        </div>
      </SectionCard>

      {o_node.type === "comment" ? (
        <SectionCard
          Icon={FiMessageCircle}
          s_title="Comment"
        >
          <CommentProperties
            o_data={o_node.data as ICommentNodeData}
            on_change={update_patch}
          />
        </SectionCard>
      ) : null}

      {o_node.type === "start" ? (
        <SectionCard
          Icon={FiPlay}
          s_title="Start"
        >
          <StartProperties
            o_data={o_node.data as IStartNodeData}
            on_change={update_patch}
          />
        </SectionCard>
      ) : null}

      {o_node.type === "http" ? (
        <SectionCard
          Icon={FiGlobe}
          s_title="HTTP"
        >
          <HttpProperties
            o_data={o_node.data as IHttpNodeData}
            on_change={update_patch}
          />
        </SectionCard>
      ) : null}

      {o_node.type === "condition" ? (
        <SectionCard
          Icon={FiGitBranch}
          s_title="Condition"
        >
          <ConditionProperties
            o_data={o_node.data as IConditionNodeData}
            on_change={update_patch}
          />
        </SectionCard>
      ) : null}

      {o_node.type === "switch" ? (
        <SectionCard
          Icon={FiShuffle}
          s_title="Switch"
        >
          <SwitchProperties
            o_data={o_node.data as ISwitchNodeData}
            on_change={update_patch}
          />
        </SectionCard>
      ) : null}

      {o_node.type === "code" ? (
        <SectionCard
          Icon={FiCode}
          s_title="Code"
        >
          <CodeProperties
            o_data={o_node.data as ICodeNodeData}
            on_change={update_patch}
            o_code_textarea_style={o_code_textarea_style}
          />
        </SectionCard>
      ) : null}

      {o_node.type === "loop_for" ? (
        <SectionCard
          Icon={FiLayers}
          s_title="Loop For"
        >
          <LoopForProperties
            o_data={o_node.data as ILoopForNodeData}
            on_change={update_patch}
          />
        </SectionCard>
      ) : null}

      {o_node.type === "llm" ? (
        <SectionCard
          Icon={FiCpu}
          s_title="LLM"
        >
          <LlmProperties
            o_data={o_node.data as ILlmNodeData}
            on_change={update_patch}
          />
        </SectionCard>
      ) : null}

      {o_node.type === "classifier" ? (
        <SectionCard
          Icon={FiSliders}
          s_title="Classifier"
        >
          <ClassifierProperties
            o_data={o_node.data as IClassifierNodeData}
            on_change={update_patch}
          />
        </SectionCard>
      ) : null}

      {o_node.type === "end" ? (
        <SectionCard
          Icon={FiFlag}
          s_title="End"
        >
          <EndProperties
            o_data={o_node.data as IEndNodeData}
            on_change={update_patch}
          />
        </SectionCard>
      ) : null}

      {o_node.type === "show" ? (
        <SectionCard
          Icon={FiFlag}
          s_title="Show"
        >
          <ShowProperties
            o_data={o_node.data as IShowNodeData}
            on_change={update_patch}
          />
        </SectionCard>
      ) : null}

      {o_node.type === "group" ? (
        <SectionCard
          Icon={FiBox}
          s_title="Group"
        >
          <div style={get_field_style()}>
            <label style={get_label_style()}>Group Name</label>
            <input
              value={
                (((o_node.data as Record<string, unknown>)?.s_group_name as string) ??
                  "")
              }
              onChange={(o_event) =>
                update_patch({ s_group_name: o_event.target.value })
              }
              style={get_input_style()}
              title="Group Name"
            />
          </div>
        </SectionCard>
      ) : null}

      {o_node.type.startsWith("tool_") ? (
        <SectionCard
          Icon={FiTool}
          s_title="Tool"
          s_text={o_tool_schema?.s_label || String(o_node.type)}
        >
          <ToolProperties
            o_data={o_tool_data}
            a_fields={Array.isArray(o_tool_schema?.a_fields) ? o_tool_schema.a_fields : []}
            s_description={o_tool_schema?.s_description || ""}
            on_change={update_patch}
          />
        </SectionCard>
      ) : null}

      {o_node.type === "llm" ? (
        <SectionCard
          Icon={FiCpu}
          s_title="LLM Handles"
        >
          <LlmSpecialHandleProperties
            o_data={(((o_node.data as unknown) || {}) as Record<string, unknown>)}
            on_change={update_patch}
          />
        </SectionCard>
      ) : null}

      <SectionCard
        Icon={FiSliders}
        s_title="Event Handles"
      >
        <EventHandleProperties
          o_data={(((o_node.data as unknown) || {}) as Record<string, unknown>)}
          on_change={update_patch}
        />
      </SectionCard>
    </div>
  );
}
