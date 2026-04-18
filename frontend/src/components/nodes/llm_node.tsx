/* file: frontend/src/components/nodes/llm_node.tsx
description: Darstellung des LLM Nodes mit kompaktem Design,
sichtbaren Handles, SVG Icon und aufklappbaren Details.
history:
- 2026-03-25: Erstellt fuer xyflow LLM Node. author Marcus Schlieper
- 2026-03-27: Erweitert um Delete Button. author Marcus Schlieper
- 2026-03-27: Erweitert um Inline Eingaben im Node. author Marcus Schlieper
- 2026-04-06: Auf input_handles und output_handles mit sicheren Defaults umgestellt. author Marcus Schlieper
- 2026-04-06: Sichtbare kopierbare Handle Labels und Runtime Ergebnisanzeige ergaenzt. author Marcus Schlieper
- 2026-04-06: Tools Ausgang und Event Handles unten ergaenzt. author Marcus Schlieper
- 2026-04-06: Output Handles wieder rechts positioniert. author Marcus Schlieper
- 2026-04-06: Obere Action Handles useTool und useMemory ergaenzt. author Marcus Schlieper
- 2026-04-08: Provider Auswahl zwischen openai und endpoint sowie Endpoint Felder ergaenzt. author Marcus Schlieper
- 2026-04-08: Bei openai werden apiHost und apiKey ausgeblendet. author Marcus Schlieper
- 2026-04-11: Details einklappbar gemacht und Header Icon ergaenzt. author Marcus Schlieper
- 2026-04-13: Hover Infos und Runtime Werte an Handles integriert. author Marcus Schlieper
author Marcus Schlieper
*/
import React from "react";
import { NodeProps, useReactFlow } from "@xyflow/react";
import { ILlmNodeData } from "../../types/workflow";
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

export function LlmNode({ id, data }: NodeProps): JSX.Element {
  const { getNodes, getEdges } = useReactFlow();
  const a_nodes = getNodes();
  const a_edges = getEdges();

  const o_data = (data as ILlmNodeData) || ({} as ILlmNodeData);
  const { update_node_data } = use_workflow_store();

  const a_input_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).input_handles,
    [
      {
        s_key: "input_main",
        s_label: "Prompt Daten",
        s_description: "Hauptdaten fuer den Prompt",
      },
      {
        s_key: "input_context",
        s_label: "Kontext",
        s_description: "Zusaetzlicher Kontext",
      },
    ]
  );

  const a_output_handles = get_safe_handle_definitions(
    (o_data as Record<string, unknown>).output_handles,
    [
      {
        s_key: "output_main",
        s_label: "Antwort",
        s_description: "Antwort des Modells",
      },
      {
        s_key: "tools",
        s_label: "Tools",
        s_description: "Tool Aufrufe des Modells",
      },
    ]
  );

  const s_provider =
    typeof (o_data as Record<string, unknown>).s_provider === "string"
      ? ((o_data as Record<string, unknown>).s_provider as string)
      : "openai";

  const s_model_name =
    typeof o_data.s_model_name === "string" ? o_data.s_model_name : "";

  const s_api_host =
    typeof o_data.s_api_host === "string" ? o_data.s_api_host : "";

  const s_api_key =
    typeof o_data.s_api_key === "string" ? o_data.s_api_key : "";

  const d_temperature =
    typeof o_data.d_temperature === "number" ? o_data.d_temperature : 0;

  const s_preview =
    (s_model_name.trim() !== "" ? s_model_name : "select_model") +
    " | " +
    s_provider;

  return (
    <div style={get_node_wrapper_style()}>
      <RenderActionHandles o_data={(o_data as Record<string, unknown>) || {}} />
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
          "rgba(139, 92, 246, 0.18)",
          "rgba(139, 92, 246, 0.34)"
        )}
      >
        <NodeHeaderTitle s_kind="llm" s_title="LLM" s_subtitle={s_preview} />
        <NodeDeleteButton node_id={id} />
      </div>

      <div style={get_node_body_style()}>
        <div style={get_meta_style()}>
          Prompt {a_input_handles.length} - Result {a_output_handles.length}
        </div>

        <NodeDetailsSection
          s_title="Model settings"
          s_meta="provider"
          b_default_open={false}
        >
          <label>
            <span style={get_label_style()}>provider</span>
            <select
              value={s_provider}
              onChange={(o_event) => {
                const s_next_provider = o_event.target.value;
                update_node_data(id, {
                  s_provider: s_next_provider,
                });
              }}
              style={get_input_style()}
            >
              <option value="openai">openai</option>
              <option value="endpoint">endpoint</option>
            </select>
          </label>

          <label>
            <span style={get_label_style()}>model</span>
            {s_provider === "openai" ? (
              <select
                value={s_model_name}
                onChange={(o_event) => {
                  update_node_data(id, { s_model_name: o_event.target.value });
                }}
                style={get_input_style()}
              >
                <option value="">select_model</option>
                {a_openai_model_options.map((s_item) => (
                  <option key={s_item} value={s_item}>
                    {s_item}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={s_model_name}
                onChange={(o_event) => {
                  update_node_data(id, { s_model_name: o_event.target.value });
                }}
                style={get_input_style()}
              />
            )}
          </label>

          {s_provider === "endpoint" ? (
            <>
              <label>
                <span style={get_label_style()}>endpoint_url</span>
                <input
                  value={s_api_host}
                  onChange={(o_event) => {
                    update_node_data(id, { s_api_host: o_event.target.value });
                  }}
                  style={get_input_style()}
                />
              </label>

              <label>
                <span style={get_label_style()}>endpoint_api_key</span>
                <input
                  value={s_api_key}
                  onChange={(o_event) => {
                    update_node_data(id, { s_api_key: o_event.target.value });
                  }}
                  style={get_input_style()}
                />
              </label>
            </>
          ) : null}

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
        </NodeDetailsSection>

        <RenderRuntimeResult
          o_data={(o_data as Record<string, unknown>) || {}}
        />
      </div>
    </div>
  );
}
