/* file: frontend/src/components/nodes/start_node.tsx
description: Darstellung des Start Nodes mit dynamischen Outputs,
kompaktem Design und aufklappbaren Details.
history:
- 2026-03-25: Erstellt fuer xyflow Start Node. author Marcus Schlieper
- 2026-03-27: Erweitert um Delete Button. author Marcus Schlieper
- 2026-03-27: Erweitert um Inline Eingaben im Node. author Marcus Schlieper
- 2026-04-06: Sichere Default Werte fuer inputs und neue output_handles ergaenzt. author Marcus Schlieper
- 2026-04-06: Style an End Node angeglichen. author Marcus Schlieper
- 2026-04-06: Sichtbare kopierbare Handle Labels und Runtime Ergebnisanzeige ergaenzt. author Marcus Schlieper
- 2026-04-06: Bottom Outputs und Event Handles ergaenzt. author Marcus Schlieper
- 2026-04-06: Output Handles wieder rechts positioniert. author Marcus Schlieper
- 2026-04-06: Start Node um dynamische Outputs mit Typ Auswahl und Add Output erweitert. author Marcus Schlieper
- 2026-04-11: Details einklappbar gemacht und Header Icon ergaenzt. author Marcus Schlieper
- 2026-04-13: Hover Infos und Runtime Werte an Outputs integriert. author Marcus Schlieper
author Marcus Schlieper
*/
import React from "react";
import { NodeProps } from "@xyflow/react";
import { IStartNodeData } from "../../types/workflow";
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

type TStartOutputType = "string" | "int" | "float" | "array" | "object";

type TStartOutputItem = {
  s_key: string;
  s_label: string;
  s_description: string;
  s_type: TStartOutputType;
  value: unknown;
};

function create_output_id(): string {
  return "output_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 100000));
}

function get_box_style(): React.CSSProperties {
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

function normalize_output_items(o_data: Record<string, unknown>): TStartOutputItem[] {
  const a_existing_output_items = Array.isArray(o_data.a_outputs)
    ? (o_data.a_outputs as unknown[])
    : [];

  const a_output_handles = get_safe_handle_definitions(
    o_data.output_handles,
    [
      {
        s_key: "output_main",
        s_label: "Startdaten",
        s_description: "Daten des Start Nodes",
      },
    ],
  );

  const a_result: TStartOutputItem[] = [];

  if (a_existing_output_items.length > 0) {
    for (let i_index = 0; i_index < a_existing_output_items.length; i_index += 1) {
      const o_item = a_existing_output_items[i_index];
      const o_item_safe =
        o_item && typeof o_item === "object" ? (o_item as Record<string, unknown>) : {};
      const o_handle = a_output_handles[i_index] || {
        s_key: i_index === 0 ? "output_main" : "output_" + String(i_index + 1),
        s_label: i_index === 0 ? "Startdaten" : "Output " + String(i_index + 1),
        s_description: "Daten des Start Nodes",
      };

      const s_type_raw =
        typeof o_item_safe.s_type === "string" ? o_item_safe.s_type.toLowerCase() : "string";

      const s_type: TStartOutputType =
        s_type_raw === "int" ||
        s_type_raw === "float" ||
        s_type_raw === "array" ||
        s_type_raw === "object"
          ? (s_type_raw as TStartOutputType)
          : "string";

      a_result.push({
        s_key:
          typeof o_item_safe.s_key === "string" && o_item_safe.s_key.trim() !== ""
            ? o_item_safe.s_key
            : String(o_handle.s_key || "output_main"),
        s_label:
          typeof o_item_safe.s_label === "string" && o_item_safe.s_label.trim() !== ""
            ? o_item_safe.s_label
            : String(o_handle.s_label || "Output"),
        s_description:
          typeof o_item_safe.s_description === "string"
            ? o_item_safe.s_description
            : String(o_handle.s_description || ""),
        s_type,
        value: o_item_safe.value,
      });
    }
  }

  if (a_result.length === 0) {
    a_result.push(get_default_output_item(0));
  }

  return a_result;
}

function build_output_handles_from_items(a_outputs: TStartOutputItem[]): THandleDefinition[] {
  if (!Array.isArray(a_outputs) || a_outputs.length === 0) {
    return [
      {
        s_key: "output_main",
        s_label: "Startdaten",
        s_description: "Daten des Start Nodes",
      },
    ];
  }

  return a_outputs.map((o_item, i_index) => ({
    s_key:
      typeof o_item.s_key === "string" && o_item.s_key.trim() !== ""
        ? o_item.s_key.trim()
        : i_index === 0
          ? "output_main"
          : "output_" + String(i_index + 1),
    s_label:
      typeof o_item.s_label === "string" && o_item.s_label.trim() !== ""
        ? o_item.s_label.trim()
        : i_index === 0
          ? "Startdaten"
          : "Output " + String(i_index + 1),
    s_description:
      typeof o_item.s_description === "string" ? o_item.s_description : "Daten des Start Nodes",
  }));
}

function render_value_input(
  o_output: TStartOutputItem,
  on_change: (value: unknown) => void,
): JSX.Element {
  if (o_output.s_type === "int") {
    return (
      <input
        type="number"
        value={typeof o_output.value === "number" ? o_output.value : 0}
        onChange={(o_event) => {
          const i_value = Number.parseInt(o_event.target.value, 10);
          on_change(Number.isFinite(i_value) ? i_value : 0);
        }}
        style={get_input_style()}
      />
    );
  }

  if (o_output.s_type === "float") {
    return (
      <input
        type="number"
        step="0.1"
        value={typeof o_output.value === "number" ? o_output.value : 0}
        onChange={(o_event) => {
          const d_value = Number.parseFloat(o_event.target.value);
          on_change(Number.isFinite(d_value) ? d_value : 0);
        }}
        style={get_input_style()}
      />
    );
  }

  if (o_output.s_type === "array") {
    return (
      <textarea
        value={typeof o_output.value === "string" ? o_output.value : ""}
        onChange={(o_event) => {
          on_change(o_event.target.value);
        }}
        style={{ ...get_input_style(), resize: "vertical", minHeight: "88px", fontFamily: "monospace" }}
      />
    );
  }

  if (o_output.s_type === "object") {
    return (
      <textarea
        value={typeof o_output.value === "string" ? o_output.value : ""}
        onChange={(o_event) => {
          on_change(o_event.target.value);
        }}
        style={{ ...get_input_style(), resize: "vertical", minHeight: "110px", fontFamily: "monospace" }}
      />
    );
  }

  return (
    <input
      value={typeof o_output.value === "string" ? o_output.value : ""}
      onChange={(o_event) => {
        on_change(o_event.target.value);
      }}
      style={get_input_style()}
    />
  );
}

export function StartNode({ id, data }: NodeProps): JSX.Element {
  const o_data = (data as IStartNodeData) || ({} as IStartNodeData);
  const { update_node_data } = use_workflow_store();
  const a_outputs = normalize_output_items((o_data as Record<string, unknown>) || {});
  const a_output_handles = build_output_handles_from_items(a_outputs);

  function update_outputs(a_next_outputs: TStartOutputItem[]): void {
    const a_safe_outputs = a_next_outputs.length > 0 ? a_next_outputs : [get_default_output_item(0)];

    update_node_data(id, {
      a_outputs: a_safe_outputs,
      output_handles: build_output_handles_from_items(a_safe_outputs),
    });
  }

  function update_output_field(i_index: number, s_key: keyof TStartOutputItem, value: unknown): void {
    const a_next_outputs = [...a_outputs];
    const o_current = a_next_outputs[i_index];
    if (!o_current) {
      return;
    }

    const o_next: TStartOutputItem = {
      ...o_current,
      [s_key]: value,
    };

    if (s_key === "s_key") {
      const s_value = String(value || "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
      o_next.s_key = s_value === "" ? create_output_id() : s_value;
    }

    a_next_outputs[i_index] = o_next;
    update_outputs(a_next_outputs);
  }

  function on_add_output(): void {
    update_outputs([...a_outputs, get_default_output_item(a_outputs.length)]);
  }

  function on_delete_output(i_index: number): void {
    if (a_outputs.length <= 1) {
      return;
    }

    update_outputs(
      a_outputs.filter((_o_item, i_current_index) => i_current_index !== i_index),
    );
  }

  return (
    <div style={get_node_wrapper_style()}>
      <RenderNamedHandles
        a_handles={a_output_handles}
        s_type="source"
        o_data={(o_data as Record<string, unknown>) || {}}
      />
      <RenderEventHandles o_data={(o_data as Record<string, unknown>) || {}} />

      <div style={get_node_header_style("rgba(16, 185, 129, 0.18)", "rgba(16, 185, 129, 0.35)")}>
        <NodeHeaderTitle
          s_kind="start"
          s_title="Start"
          s_subtitle={"Outputs " + String(a_outputs.length)}
        />
        <NodeDeleteButton node_id={id} />
      </div>

      <div style={get_node_body_style()}>
        <div style={get_meta_style()}>
          Outputs {a_outputs.length}
        </div>

        <NodeDetailsSection s_title="Start outputs" s_meta={String(a_outputs.length)} b_default_open={false}>
          {a_outputs.map((o_output, i_index) => (
            <div key={o_output.s_key || "output_" + String(i_index)} style={get_box_style()}>
              <label>
                <span style={get_label_style()}>label</span>
                <input
                  value={o_output.s_label}
                  onChange={(o_event) => {
                    update_output_field(i_index, "s_label", o_event.target.value);
                  }}
                  style={get_input_style()}
                />
              </label>

              <label>
                <span style={get_label_style()}>key</span>
                <input
                  value={o_output.s_key}
                  onChange={(o_event) => {
                    update_output_field(i_index, "s_key", o_event.target.value);
                  }}
                  style={get_input_style()}
                />
              </label>

              <label>
                <span style={get_label_style()}>type</span>
                <select
                  value={o_output.s_type}
                  onChange={(o_event) => {
                    update_output_field(i_index, "s_type", o_event.target.value as TStartOutputType);
                  }}
                  style={get_input_style()}
                >
                  <option value="string">String</option>
                  <option value="int">Int</option>
                  <option value="float">Float</option>
                  <option value="array">Array</option>
                  <option value="object">Object</option>
                </select>
              </label>

              <label>
                <span style={get_label_style()}>value</span>
                {render_value_input(o_output, (value: unknown) => {
                  update_output_field(i_index, "value", value);
                })}
              </label>

              <label>
                <span style={get_label_style()}>description</span>
                <input
                  value={o_output.s_description}
                  onChange={(o_event) => {
                    update_output_field(i_index, "s_description", o_event.target.value);
                  }}
                  style={get_input_style()}
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  on_delete_output(i_index);
                }}
                disabled={a_outputs.length <= 1}
                style={{
                  ...get_button_style("danger"),
                  opacity: a_outputs.length <= 1 ? 0.5 : 1,
                  cursor: a_outputs.length <= 1 ? "not-allowed" : "pointer",
                }}
              >
                Delete Output
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              on_add_output();
            }}
            style={get_button_style("primary")}
          >
            Add Output
          </button>
        </NodeDetailsSection>

        <RenderRuntimeResult o_data={(o_data as Record<string, unknown>) || {}} />
      </div>
    </div>
  );
}
