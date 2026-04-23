/* file: frontend/src/components/nodes/code_node.tsx
description: Darstellung des Python Code Nodes mit kompaktem Design,
sichtbaren Handles und aufklappbaren Details.
history:
- 2026-04-03: Erstellt fuer Python Code Node mit beliebig vielen Eingaben und Ausgaben. author Marcus Schlieper
- 2026-04-03: Dynamische Eingangs Handles fuer Inputs und Ausgangs Handles fuer Outputs ergaenzt. author Marcus Schlieper
- 2026-04-03: Zentrale einheitliche Handle Styles integriert. author Marcus Schlieper
- 2026-04-06: Auf input_handles und output_handles mit Rueckwaertskompatibilitaet erweitert. author Marcus Schlieper
- 2026-04-06: Sichtbare kopierbare Handle Labels und Runtime Ergebnisanzeige ergaenzt. author Marcus Schlieper
- 2026-04-06: Bottom Outputs und Event Handles ergaenzt. author Marcus Schlieper
- 2026-04-06: Output Handles wieder rechts positioniert. author Marcus Schlieper
- 2026-04-11: Details einklappbar gemacht und Header Icon ergaenzt. author Marcus Schlieper
- 2026-04-13: Hover Infos und Runtime Werte an Input und Output Handles aktiviert. author Marcus Schlieper
author Marcus Schlieper
*/

import React from "react";
import { NodeProps, useReactFlow } from "@xyflow/react";
import { ICodeNodeData } from "../../types/workflow";
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

import { BaseNodeStatusBadge } from "./base_node_status_badge";

function get_item_box_style(): React.CSSProperties {
  return {
    position: "relative",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "8px 12px",
    backgroundColor: "#f8fafc",
    marginBottom: "8px",
  };
}

function get_code_style(): React.CSSProperties {
  return {
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "10px",
    backgroundColor: "#0f172a",
    color: "#e5e7eb",
    fontFamily: "monospace",
    fontSize: "12px",
    whiteSpace: "pre-wrap",
    minHeight: "120px",
  };
}

export function CodeNode({ id, data }: NodeProps): JSX.Element {
  const { getNodes, getEdges } = useReactFlow();
  const a_nodes = getNodes();
  const a_edges = getEdges();

  const o_data = (data as ICodeNodeData) || ({} as ICodeNodeData);
  const { update_node_data } = use_workflow_store();

  const a_legacy_inputs = Array.isArray(
    (o_data as Record<string, unknown>).inputs
  )
    ? ((o_data as Record<string, unknown>).inputs as unknown[]) || []
    : [];

  const a_legacy_outputs = Array.isArray(
    (o_data as Record<string, unknown>).outputs
  )
    ? ((o_data as Record<string, unknown>).outputs as unknown[]) || []
    : [];

  const a_input_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).input_handles,
    [
      {
        s_key: "input_main",
        s_label: "Daten",
        s_description: "Hauptdaten fuer den Code",
      },
      {
        s_key: "input_config",
        s_label: "Konfiguration",
        s_description: "Optionale Einstellungen",
      },
    ]
  );

  const a_output_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).output_handles,
    [
      {
        s_key: "output_main",
        s_label: "Ergebnis",
        s_description: "Ergebnis des Codes",
      },
      {
        s_key: "output_error",
        s_label: "Fehler",
        s_description: "Fehlerausgang",
      },
    ]
  );

  const s_python_code =
    typeof (o_data as Record<string, unknown>).s_python_code === "string"
      ? ((o_data as Record<string, unknown>).s_python_code as string)
      : "";

  const s_code_preview =
    s_python_code.trim() !== "" ? s_python_code.trim().slice(0, 24) : "No code";

  return (
    <div style={get_node_wrapper_style()}>
      <RenderNamedHandles
        a_handles={a_input_handles}
        s_type="target"
        o_data={(o_data as Record) || {}}
        s_node_id={id}
        a_nodes={a_nodes}
        a_edges={a_edges}
      />

      <RenderNamedHandles
        a_handles={a_output_handles}
        s_type="source"
        o_data={(o_data as Record) || {}}
        s_node_id={id}
        a_nodes={a_nodes}
        a_edges={a_edges}
      />

      <RenderEventHandles o_data={(o_data as Record<string, unknown>) || {}} />

      <div
        style={get_node_header_style(
          "rgba(15, 23, 42, 0.16)",
          "rgba(51, 65, 85, 0.28)"
        )}
      >
        <NodeHeaderTitle
          s_kind="code"
          s_title="Code"
          s_subtitle={s_code_preview}
        />
        <BaseNodeStatusBadge s_runtime_status={String(data?.s_runtime_status || "")} />
        <NodeDeleteButton node_id={id} />
      </div>

      <div style={get_node_body_style()}>
        <div style={get_meta_style()}>
          {a_input_handles.length} inputs - {a_output_handles.length} outputs
        </div>

        <NodeDetailsSection
          s_title="Python code"
          s_meta="script"
          b_default_open={false}
        >
          <textarea
            value={s_python_code}
            onChange={(o_event) => {
              update_node_data(id, { s_python_code: o_event.target.value });
            }}
            rows={8}
            spellCheck={false}
            style={{ ...get_input_style(), ...get_code_style() }}
          />
        </NodeDetailsSection>

        <NodeDetailsSection
          s_title="Inputs"
          s_meta={String(a_input_handles.length)}
          b_default_open={false}
        >
          {a_input_handles.length === 0 ? (
            <div style={get_meta_style()}>No inputs</div>
          ) : (
            a_input_handles.map((o_item, i_index) => (
              <div
                key={o_item.s_key || "input_" + String(i_index)}
                style={get_item_box_style()}
              >
                <div style={get_label_style()}>
                  {o_item.s_label ||
                    o_item.s_key ||
                    "input" + String(i_index + 1)}
                </div>
                <div style={get_meta_style()}>
                  {(o_item.s_key || "input_" + String(i_index + 1)) +
                    " | " +
                    (o_item.s_description || "-")}
                </div>
              </div>
            ))
          )}
        </NodeDetailsSection>

        <NodeDetailsSection
          s_title="Outputs"
          s_meta={String(a_output_handles.length)}
          b_default_open={false}
        >
          {a_output_handles.length === 0 ? (
            <div style={get_meta_style()}>No outputs</div>
          ) : (
            a_output_handles.map((o_item, i_index) => (
              <div
                key={o_item.s_key || "output_" + String(i_index)}
                style={get_item_box_style()}
              >
                <div style={get_label_style()}>
                  {o_item.s_label ||
                    o_item.s_key ||
                    "output" + String(i_index + 1)}
                </div>
                <div style={get_meta_style()}>
                  {(o_item.s_key || "output_" + String(i_index + 1)) +
                    " | " +
                    (o_item.s_description || "-")}
                </div>
              </div>
            ))
          )}
        </NodeDetailsSection>

        <NodeDetailsSection
          s_title="Legacy info"
          s_meta="compat"
          b_default_open={false}
        >
          <div style={get_meta_style()}>
            {a_legacy_inputs.length} legacy inputs - {a_legacy_outputs.length}{" "}
            legacy outputs
          </div>
        </NodeDetailsSection>

        <RenderRuntimeResult
          o_data={(o_data as Record<string, unknown>) || {}}
        />
      </div>
    </div>
  );
}
