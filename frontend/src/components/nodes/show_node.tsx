/* file: frontend/src/components/nodes/show_node.tsx
description: Darstellung des Show Nodes mit kompaktem Design,
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
- 2026-05-01: Preview und Runtime Anzeige fuer direkte Template Werte verbessert. author Marcus Schlieper
author Marcus Schlieper
*/

import React from "react";
import { NodeProps, useReactFlow } from "@xyflow/react";
import { IShowNodeData } from "../../types/workflow";
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
  DirectRenderRuntimeResult
} from "./node_runtime_helpers";
import { BaseNodeStatusBadge } from "./base_node_status_badge";

type TRecord = Record<string, unknown>;

function get_preview_text(s_value: string): string {
  const s_trimmed = typeof s_value === "string" ? s_value.trim() : "";
  if (s_trimmed === "") {
    return "No result";
  }
  return s_trimmed.length > 24 ? `${s_trimmed.slice(0, 24)}...` : s_trimmed;
}

export function ShowNode({ id, data }: NodeProps): JSX.Element {
  const { getNodes, getEdges } = useReactFlow();
  const a_nodes = getNodes();
  const a_edges = getEdges();

  const o_data = (data as IShowNodeData) || ({} as IShowNodeData);
  const { update_node_data } = use_workflow_store();

  const a_legacy_outputs = Array.isArray((o_data as TRecord).outputs)
    ? (((o_data as TRecord).outputs as unknown[]) || [])
    : [];

  const a_input_handles = get_safe_handle_definitions(
    (o_data as TRecord).input_handles,
    [
      {
        s_key: "input_main",
        s_label: "Ergebnis",
        s_description: "Ergebnis des Workflows",
      },
    ]
  );

  const a_output_handles = get_safe_handle_definitions(
    (o_data as TRecord).output_handles,
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
    typeof (o_data as TRecord).s_result === "string"
      ? ((o_data as TRecord).s_result as string)
      : typeof o_data.s_query === "string"
      ? o_data.s_query
      : "{{input:input_main.value}}";

  const s_preview = get_preview_text(s_result);

  return (
    <div style={get_node_wrapper_style()}>
      <NodeDeleteButton s_node_id={id} />

      <RenderNamedHandles
        a_handles={a_input_handles as THandleDefinition[]}
        s_type="target"
        o_data={(o_data as TRecord) || {}}
      />

      <RenderNamedHandles
        a_handles={a_output_handles as THandleDefinition[]}
        s_type="source"
        o_data={(o_data as TRecord) || {}}
      />

      <RenderEventHandles o_data={(o_data as TRecord) || {}} />

      <div
        style={get_node_header_style(
          "rgba(14, 165, 233, 0.16)",
          "rgba(14, 165, 233, 0.28)"
        )}
      >
        <NodeHeaderTitle
          s_kind="show"
          s_title="Show"
          s_subtitle={b_success ? "Frontend Ausgabe" : "Fehler Ausgabe"}
        />
        <BaseNodeStatusBadge
          s_runtime_status={
            typeof (o_data as TRecord).s_runtime_status === "string"
              ? ((o_data as TRecord).s_runtime_status as string)
              : "idle"
          }
          i_runtime_ms={
            typeof (o_data as TRecord).i_runtime_ms === "number"
              ? ((o_data as TRecord).i_runtime_ms as number)
              : 0
          }
        />
      </div>

      <div style={get_node_body_style()}>
        <div style={get_meta_style()}>
          {a_nodes.length} nodes - {a_edges.length} edges
        </div>

        <label style={get_label_style()}>Result Template</label>
        <input
          style={get_input_style()}
          type="text"
          value={s_result}
          onChange={(o_event) => {
            const s_next_value = o_event.target.value;
            update_node_data(id, {
              s_result: s_next_value,
            });
          }}
          placeholder="{{input:input_main.results}}"
        />
        <DirectRenderRuntimeResult o_data={(o_data as TRecord) || {}} />
      </div>

      
    </div>

    
  );
}
