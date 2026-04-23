/* file: frontend/src/components/nodes/group_node.tsx
description: Darstellung des Group Nodes mit kompaktem Design,
sichtbaren Handles und aufklappbaren Details.
history:
- 2026-03-25: Erstellt fuer xyflow Group Node. author Marcus Schlieper
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
import { IGroupNodeData } from "../../types/workflow";
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

export function GroupNode({ id, data }: NodeProps): JSX.Element {
  const { getNodes, getEdges } = useReactFlow();
  const a_nodes = getNodes();
  const a_edges = getEdges();

  const o_data = (data as IGroupNodeData) || ({} as IGroupNodeData);
  const { update_node_data } = use_workflow_store();

  const a_child_node_ids = Array.isArray(
    (o_data as Record<string, unknown>).child_node_ids
  )
    ? ((o_data as Record<string, unknown>).child_node_ids as unknown[]) || []
    : [];

  const a_input_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).input_handles,
    [
      {
        s_key: "input_main",
        s_label: "Daten",
        s_description: "Hauptdaten",
      },
    ]
  );

  const a_output_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).output_handles,
    [
      {
        s_key: "output_main",
        s_label: "Ergebnis",
        s_description: "Gruppen Ergebnis",
      },
    ]
  );

  const s_group_name =
    typeof (o_data as Record<string, unknown>).s_group_name === "string"
      ? ((o_data as Record<string, unknown>).s_group_name as string)
      : "";

  const s_preview =
    s_group_name.trim() !== "" ? s_group_name.trim() : "Unnamed group";

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
          "rgba(99, 102, 241, 0.18)",
          "rgba(99, 102, 241, 0.34)"
        )}
      >
        <NodeHeaderTitle
          s_kind="group"
          s_title="Group"
          s_subtitle={s_preview}
        />
        <BaseNodeStatusBadge s_runtime_status={String(data?.s_runtime_status || "")} />
        <NodeDeleteButton node_id={id} />
      </div>

      <div style={get_node_body_style()}>
        <div style={get_meta_style()}>
          Group - {a_child_node_ids.length} nodes
        </div>

        <NodeDetailsSection
          s_title="Group settings"
          s_meta="name"
          b_default_open={false}
        >
          <label>
            <span style={get_label_style()}>name</span>
            <input
              value={s_group_name}
              onChange={(o_event) => {
                update_node_data(id, { s_group_name: o_event.target.value });
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
