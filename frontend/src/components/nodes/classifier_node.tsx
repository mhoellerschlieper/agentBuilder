/* file: frontend/src/components/nodes/classifier_node.tsx */
/* description: Darstellung des Classifier Nodes mit LLM aehnlicher Bedienung und Switch aehnlichen Klassen Ausgaengen. */
/* history: */
/* - 2026-04-12: Erstellt fuer Classifier Node mit Prompt, Model und Klassen Ausgaengen. author Marcus Schlieper */
/* - 2026-04-13: Handle Hover Infos und Runtime Werte fuer Inputs und Outputs integriert. author Marcus Schlieper */
/* author Marcus Schlieper */

import React from "react";
import { NodeProps } from "@xyflow/react";
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
  RenderActionHandles,
  RenderEventHandles,
  RenderNamedHandles,
  RenderRuntimeResult,
} from "./node_runtime_helpers";

type TClassifierClassItem = {
  s_id?: string;
  s_label?: string;
  s_description?: string;
};

type TClassifierNodeData = Record<string, unknown> & {
  s_label?: string;
  s_provider?: string;
  s_model_name?: string;
  d_temperature?: number;
  s_system_prompt?: string;
  s_prompt?: string;
  classes?: TClassifierClassItem[];
  input_handles?: THandleDefinition[];
  output_handles?: THandleDefinition[];
};

const a_model_options: string[] = [
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

function create_class_id(): string {
  return "class_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 100000));
}

function get_item_box_style(): React.CSSProperties {
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

function build_output_handles(
  a_classes: TClassifierClassItem[],
): THandleDefinition[] {
  const a_class_handles: THandleDefinition[] = a_classes.map((o_class, i_index) => {
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

  a_class_handles.push({
    s_key: "default",
    s_label: "default",
    s_description: "Fallback Ausgang",
  });

  a_class_handles.push({
    s_key: "output_main",
    s_label: "Ergebnis",
    s_description: "Classifier Ergebnis",
  });

  return a_class_handles;
}

export function ClassifierNode({ id, data }: NodeProps): JSX.Element {
  const o_data = (data as TClassifierNodeData) || ({} as TClassifierNodeData);
  const { update_node_data } = use_workflow_store();

  const a_classes = Array.isArray(o_data.classes) ? o_data.classes : [];

  const a_input_handles = get_safe_handle_definitions(
    o_data.input_handles,
    [
      {
        s_key: "input_main",
        s_label: "Eingabe",
        s_description: "Text oder Daten fuer Klassifikation",
      },
    ],
  );

  const a_output_handles = get_safe_handle_definitions(
    o_data.output_handles,
    build_output_handles(a_classes),
  );

  const s_provider =
    typeof o_data.s_provider === "string" && o_data.s_provider.trim() !== ""
      ? o_data.s_provider
      : "openai";

  const s_model_name =
    typeof o_data.s_model_name === "string" ? o_data.s_model_name : "";

  const d_temperature =
    typeof o_data.d_temperature === "number" && Number.isFinite(o_data.d_temperature)
      ? o_data.d_temperature
      : 0;

  const s_system_prompt =
    typeof o_data.s_system_prompt === "string" ? o_data.s_system_prompt : "";

  const s_prompt =
    typeof o_data.s_prompt === "string" ? o_data.s_prompt : "";

  function sync_classes(a_next_classes: TClassifierClassItem[]): void {
    update_node_data(id, {
      classes: a_next_classes,
      output_handles: build_output_handles(a_next_classes),
    });
  }

  function on_add_class(): void {
    sync_classes([
      ...a_classes,
      {
        s_id: create_class_id(),
        s_label: "",
        s_description: "",
      },
    ]);
  }

  function on_delete_class(i_index: number): void {
    if (i_index < 0 || i_index >= a_classes.length) {
      return;
    }

    sync_classes(
      a_classes.filter((_o_item, i_current_index) => i_current_index !== i_index),
    );
  }

  function on_update_class(
    i_index: number,
    o_patch: Partial<TClassifierClassItem>,
  ): void {
    const a_next_classes = [...a_classes];
    const o_current =
      a_next_classes[i_index] && typeof a_next_classes[i_index] === "object"
        ? { ...a_next_classes[i_index] }
        : { s_id: create_class_id() };

    a_next_classes[i_index] = {
      ...o_current,
      ...o_patch,
      s_id:
        typeof o_current.s_id === "string" && o_current.s_id.trim() !== ""
          ? o_current.s_id
          : create_class_id(),
    };

    sync_classes(a_next_classes);
  }

  return (
    <div style={get_node_wrapper_style()}>
      <RenderActionHandles o_data={(o_data as Record<string, unknown>) || {}} />
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

      <div style={get_node_header_style("rgba(168, 85, 247, 0.18)", "rgba(168, 85, 247, 0.34)")}>
        <NodeHeaderTitle
          s_kind="classifier"
          s_title={typeof o_data.s_label === "string" && o_data.s_label.trim() !== "" ? o_data.s_label : "Classifier"}
          s_subtitle={s_model_name.trim() !== "" ? s_model_name : "classify_text"}
        />
        <NodeDeleteButton node_id={id} />
      </div>

      <div style={get_node_body_style()}>
        <div style={get_meta_style()}>
          provider {s_provider} - {a_classes.length} classes
        </div>

        <NodeDetailsSection s_title="Classifier settings" s_meta="model and prompt" b_default_open={false}>
          <label>
            <span style={get_label_style()}>provider</span>
            <select
              value={s_provider}
              onChange={(o_event) => {
                update_node_data(id, { s_provider: o_event.target.value });
              }}
              style={get_input_style()}
            >
              <option value="openai">openai</option>
              <option value="endpoint">endpoint</option>
            </select>
          </label>

          <label>
            <span style={get_label_style()}>model_name</span>
            <select
              value={s_model_name}
              onChange={(o_event) => {
                update_node_data(id, { s_model_name: o_event.target.value });
              }}
              style={get_input_style()}
            >
              <option value="">not_set</option>
              {a_model_options.map((s_item) => (
                <option key={s_item} value={s_item}>
                  {s_item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span style={get_label_style()}>temperature</span>
            <input
              type="number"
              step="0.1"
              value={d_temperature}
              onChange={(o_event) => {
                const d_value = Number(o_event.target.value);
                update_node_data(id, {
                  d_temperature: Number.isFinite(d_value) ? d_value : 0,
                });
              }}
              style={get_input_style()}
            />
          </label>

          <label>
            <span style={get_label_style()}>system_prompt</span>
            <textarea
              value={s_system_prompt}
              onChange={(o_event) => {
                update_node_data(id, { s_system_prompt: o_event.target.value });
              }}
              rows={3}
              style={get_input_style()}
            />
          </label>

          <label>
            <span style={get_label_style()}>prompt</span>
            <textarea
              value={s_prompt}
              onChange={(o_event) => {
                update_node_data(id, { s_prompt: o_event.target.value });
              }}
              rows={4}
              style={get_input_style()}
            />
          </label>
        </NodeDetailsSection>

        <NodeDetailsSection s_title="Classes" s_meta={String(a_classes.length)} b_default_open={false}>
          {a_classes.length === 0 ? (
            <div style={get_meta_style()}>No classes</div>
          ) : (
            a_classes.map((o_class, i_index) => {
              const s_class_label =
                typeof o_class.s_label === "string" ? o_class.s_label : "";
              const s_class_description =
                typeof o_class.s_description === "string"
                  ? o_class.s_description
                  : "";

              return (
                <div key={o_class.s_id || "class_" + String(i_index)} style={get_item_box_style()}>
                  <label>
                    <span style={get_label_style()}>class_label</span>
                    <input
                      value={s_class_label}
                      onChange={(o_event) => {
                        on_update_class(i_index, {
                          s_label: o_event.target.value,
                        });
                      }}
                      style={get_input_style()}
                    />
                  </label>

                  <label>
                    <span style={get_label_style()}>class_description</span>
                    <input
                      value={s_class_description}
                      onChange={(o_event) => {
                        on_update_class(i_index, {
                          s_description: o_event.target.value,
                        });
                      }}
                      style={get_input_style()}
                    />
                  </label>

                  <div style={get_meta_style()}>
                    output handle: class_{String(i_index + 1)}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      on_delete_class(i_index);
                    }}
                    style={get_button_style("danger")}
                  >
                    Delete Class
                  </button>
                </div>
              );
            })
          )}

          <button
            type="button"
            onClick={() => {
              on_add_class();
            }}
            style={get_button_style("primary")}
          >
            Add Class
          </button>
        </NodeDetailsSection>

        <RenderRuntimeResult o_data={(o_data as Record<string, unknown>) || {}} />
      </div>
    </div>
  );
}
