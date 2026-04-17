/* file: frontend/src/components/nodes/loop_for_node.tsx
description: Darstellung des Loop For Nodes mit kompaktem Design,
sichtbaren Handles und aufklappbaren Details.
history:
- 2026-03-25: Erstellt fuer xyflow Loop Node. author Marcus Schlieper
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
import { NodeProps } from "@xyflow/react";
import { ILoopForNodeData } from "../../types/workflow";
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

export function LoopForNode({ id, data }: NodeProps): JSX.Element {
  const o_data = (data as ILoopForNodeData) || ({} as ILoopForNodeData);
  const { update_node_data } = use_workflow_store();

  const a_input_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).input_handles,
    [
      {
        s_key: "input_main",
        s_label: "Daten",
        s_description: "Daten fuer die Schleife",
      },
    ],
  );

  const a_output_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).output_handles,
    [
      {
        s_key: "output_main",
        s_label: "Ergebnis",
        s_description: "Ergebnis der Schleife",
      },
    ],
  );

  const s_source_array_variable =
    typeof o_data.s_source_array_variable === "string"
      ? o_data.s_source_array_variable
      : "";

  const s_item_variable =
    typeof o_data.s_item_variable === "string" ? o_data.s_item_variable : "";

  const s_index_variable =
    typeof o_data.s_index_variable === "string" ? o_data.s_index_variable : "";

  const s_preview =
    s_source_array_variable.trim() !== "" ? s_source_array_variable.trim() : "array_source";

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

      <div style={get_node_header_style("rgba(20, 184, 166, 0.18)", "rgba(20, 184, 166, 0.34)")}>
        <NodeHeaderTitle
          s_kind="loop"
          s_title="Loop For"
          s_subtitle={s_preview}
        />
        <NodeDeleteButton node_id={id} />
      </div>

      <div style={get_node_body_style()}>
        <div style={get_meta_style()}>
          Array Input {a_input_handles.length} - Iterator {a_output_handles.length}
        </div>

        <NodeDetailsSection s_title="Loop settings" s_meta="variables" b_default_open={false}>
          <label>
            <span style={get_label_style()}>source</span>
            <input
              value={s_source_array_variable}
              onChange={(o_event) => {
                update_node_data(id, {
                  s_source_array_variable: o_event.target.value,
                });
              }}
              style={get_input_style()}
            />
          </label>

          <label>
            <span style={get_label_style()}>item</span>
            <input
              value={s_item_variable}
              onChange={(o_event) => {
                update_node_data(id, { s_item_variable: o_event.target.value });
              }}
              style={get_input_style()}
            />
          </label>

          <label>
            <span style={get_label_style()}>index</span>
            <input
              value={s_index_variable}
              onChange={(o_event) => {
                update_node_data(id, { s_index_variable: o_event.target.value });
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
