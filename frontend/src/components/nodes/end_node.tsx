/* file: frontend/src/components/nodes/end_node.tsx
description: Darstellung des End Nodes mit kompaktem Design,
sichtbaren Handles und aufklappbaren Details.
history:
- 2026-03-25: Erstellt fuer xyflow End Node. author Marcus Schlieper
- 2026-03-27: Erweitert um Delete Button. author Marcus Schlieper
- 2026-03-27: Erweitert um Inline Eingaben im Node. author Marcus Schlieper
- 2026-04-06: Auf benannte input_handles und output_handles mit sicheren Defaults umgestellt. author Marcus Schlieper
- 2026-04-06: Sichtbare kopierbare Handle Labels und Runtime Ergebnisanzeige ergaenzt. author Marcus Schlieper
- 2026-04-06: Bottom Outputs und Event Handles ergaenzt. author Marcus Schlieper
- 2026-04-06: Output Handles wieder rechts positioniert. author Marcus Schlieper
- 2026-04-07: Query Feld durch Result Feld ersetzt, damit branch spezifische Start Outputs direkt angezeigt werden koennen. author Marcus Schlieper
- 2026-04-11: Details einklappbar gemacht und Header Icon ergaenzt. author Marcus Schlieper
- 2026-04-13: Hover Infos und Runtime Werte an Handles integriert. author Marcus Schlieper
author Marcus Schlieper
*/

import React from "react";
import { NodeProps, useReactFlow } from "@xyflow/react";
import { IEndNodeData } from "../../types/workflow";
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

export function EndNode({ id, data }: NodeProps): JSX.Element {
  const { getNodes, getEdges } = useReactFlow();
  const a_nodes = getNodes();
  const a_edges = getEdges();

  const o_data = (data as IEndNodeData) || ({} as IEndNodeData);
  const { update_node_data } = use_workflow_store();

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
        s_label: "Endergebnis",
        s_description: "Abschlussdaten des Workflows",
      },
    ]
  );

  const a_output_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).output_handles,
    [
      {
        s_key: "output_main",
        s_label: "Frontend Ergebnis",
        s_description: "Ergebnis fuer das Frontend",
      },
    ]
  );

  const b_success =
    typeof o_data.b_success === "boolean" ? o_data.b_success : true;

  const s_result =
    typeof (o_data as Record<string, unknown>).s_result === "string"
      ? ((o_data as Record<string, unknown>).s_result as string)
      : typeof o_data.s_query === "string"
      ? o_data.s_query
      : "{{input:input_main.value}}";

  const s_preview =
    s_result.trim() !== "" ? s_result.trim().slice(0, 24) : "No result";

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
          "rgba(239, 68, 68, 0.16)",
          "rgba(239, 68, 68, 0.30)"
        )}
      >
        <NodeHeaderTitle s_kind="end" s_title="End" s_subtitle={s_preview} />
        <NodeDeleteButton node_id={id} />
      </div>

      <div style={get_node_body_style()}>
        <div style={get_meta_style()}>
          {a_input_handles.length} inputs - {a_output_handles.length} outputs
        </div>

        <NodeDetailsSection
          s_title="End settings"
          s_meta="result"
          b_default_open={false}
        >
          <label>
            <span style={get_label_style()}>success</span>
            <select
              value={b_success ? "true" : "false"}
              onChange={(o_event) => {
                update_node_data(id, {
                  b_success: o_event.target.value === "true",
                });
              }}
              style={get_input_style()}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>

          <label>
            <span style={get_label_style()}>result</span>
            <textarea
              value={s_result}
              onChange={(o_event) => {
                update_node_data(id, {
                  s_result: o_event.target.value,
                  s_query: o_event.target.value,
                });
              }}
              rows={4}
              style={get_input_style()}
            />
          </label>
        </NodeDetailsSection>

        <NodeDetailsSection
          s_title="Legacy info"
          s_meta="compat"
          b_default_open={false}
        >
          <div style={get_meta_style()}>
            {a_legacy_outputs.length} legacy outputs
          </div>
        </NodeDetailsSection>

        <RenderRuntimeResult
          o_data={(o_data as Record<string, unknown>) || {}}
        />
      </div>
    </div>
  );
}
