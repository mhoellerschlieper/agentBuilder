/* file: frontend/src/components/nodes/http_node.tsx
description: Darstellung des HTTP Nodes mit kompaktem Design,
sichtbaren Handles und aufklappbaren Details.
history:
- 2026-03-25: Erstellt fuer xyflow HTTP Node. author Marcus Schlieper
- 2026-03-27: Erweitert um Delete Button. author Marcus Schlieper
- 2026-03-27: Erweitert um Inline Eingaben im Node. author Marcus Schlieper
- 2026-04-06: Auf input_handles und output_handles mit sicheren Defaults umgestellt. author Marcus Schlieper
- 2026-04-06: Sichtbare kopierbare Handle Labels und Runtime Ergebnisanzeige ergaenzt. author Marcus Schlieper
- 2026-04-06: Bottom Outputs und Event Handles ergaenzt. author Marcus Schlieper
- 2026-04-06: Output Handles wieder rechts positioniert. author Marcus Schlieper
- 2026-04-11: Details einklappbar gemacht und Header Icon ergaenzt. author Marcus Schlieper
- 2026-04-13: Hover Infos und Runtime Werte an Handles integriert. author Marcus Schlieper
author Marcus Schlieper
*/

import React from "react";
import { NodeProps, useReactFlow } from "@xyflow/react";
import { IHttpNodeData } from "../../types/workflow";
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

export function HttpNode({ id, data }: NodeProps): JSX.Element {
  const { getNodes, getEdges } = useReactFlow();
  const a_nodes = getNodes();
  const a_edges = getEdges();

  const o_data = (data as IHttpNodeData) || ({} as IHttpNodeData);
  const { update_node_data } = use_workflow_store();

  const a_input_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).input_handles,
    [
      {
        s_key: "input_main",
        s_label: "Anfrage",
        s_description: "Hauptdaten fuer den HTTP Aufruf",
      },
    ]
  );

  const a_output_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).output_handles,
    [
      {
        s_key: "output_main",
        s_label: "Antwort",
        s_description: "Ergebnis des HTTP Aufrufs",
      },
    ]
  );

  const s_api =
    typeof (o_data as Record<string, unknown>).s_api === "string"
      ? ((o_data as Record<string, unknown>).s_api as string)
      : "";

  const s_method =
    typeof (o_data as Record<string, unknown>).s_method === "string"
      ? ((o_data as Record<string, unknown>).s_method as string)
      : "GET";

  const i_timeout =
    typeof (o_data as Record<string, unknown>).i_timeout === "number"
      ? ((o_data as Record<string, unknown>).i_timeout as number)
      : 0;

  const s_preview =
    s_method +
    " " +
    (s_api.trim() !== "" ? s_api.trim().slice(0, 18) : "no_api");

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
          "rgba(59, 130, 246, 0.18)",
          "rgba(59, 130, 246, 0.34)"
        )}
      >
        <NodeHeaderTitle s_kind="http" s_title="HTTP" s_subtitle={s_preview} />
        <BaseNodeStatusBadge s_runtime_status={String(data?.s_runtime_status || "")} />
        <NodeDeleteButton node_id={id} />
      </div>

      <div style={get_node_body_style()}>
        <div style={get_meta_style()}>
          Inputs {a_input_handles.length} - Outputs {a_output_handles.length}
        </div>

        <NodeDetailsSection
          s_title="HTTP settings"
          s_meta="request"
          b_default_open={false}
        >
          <label>
            <span style={get_label_style()}>api</span>
            <input
              value={s_api}
              onChange={(o_event) => {
                update_node_data(id, { s_api: o_event.target.value });
              }}
              style={get_input_style()}
            />
          </label>

          <label>
            <span style={get_label_style()}>method</span>
            <select
              value={s_method}
              onChange={(o_event) => {
                update_node_data(id, { s_method: o_event.target.value });
              }}
              style={get_input_style()}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </label>

          <label>
            <span style={get_label_style()}>timeout</span>
            <input
              type="number"
              value={i_timeout}
              onChange={(o_event) => {
                const i_value = Number(o_event.target.value);
                update_node_data(id, {
                  i_timeout: Number.isFinite(i_value) ? i_value : 0,
                });
              }}
              style={get_input_style()}
            />
          </label>
        </NodeDetailsSection>

        <RenderRuntimeResult
          o_data={(o_data as Record<string, unknown>) || {}}
        />
      </div>
    </div>
  );
}
