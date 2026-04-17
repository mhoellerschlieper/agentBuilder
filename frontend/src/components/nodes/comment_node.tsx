/* file: frontend/src/components/nodes/comment_node.tsx
description: Kommentar Node fuer das Canvas mit kompaktem Header
und aufklappbaren Details.
history:
- 2026-03-27: Erstellt fuer Kommentarfunktion im Canvas. author Marcus Schlieper
- 2026-03-27: Erweitert um Inline Eingaben im Node. author Marcus Schlieper
- 2026-04-11: Details aufklappbar gemacht und Icon Design ergaenzt. author Marcus Schlieper
- 2026-04-13: Komponente auf vollstaendige neue Node Struktur vereinheitlicht. author Marcus Schlieper
author Marcus Schlieper
*/

import React from "react";
import { NodeProps } from "@xyflow/react";
import { ICommentNodeData } from "../../types/workflow";
import { NodeDeleteButton } from "../node_delete_button";
import { use_workflow_store } from "../../store/workflow_store";
import {
  NodeDetailsSection,
  NodeHeaderTitle,
  get_input_style,
  get_label_style,
  get_meta_style,
  get_node_body_style,
  get_node_header_style,
  get_node_wrapper_style,
} from "./node_runtime_helpers";

export function CommentNode({ id, data }: NodeProps): JSX.Element {
  const o_data = (data as ICommentNodeData) || ({} as ICommentNodeData);
  const { update_node_data } = use_workflow_store();

  const s_text =
    typeof o_data.s_text === "string" ? o_data.s_text : "";

  const s_color =
    typeof o_data.s_color === "string" && o_data.s_color.trim() !== ""
      ? o_data.s_color
      : "#fef08a";

  const s_preview =
    s_text.trim() !== "" ? s_text.trim().slice(0, 28) : "No text";

  return (
    <div style={get_node_wrapper_style()}>
      <div style={get_node_header_style("rgba(234, 179, 8, 0.18)", "rgba(234, 179, 8, 0.34)")}>
        <NodeHeaderTitle
          s_kind="comment"
          s_title="Comment"
          s_subtitle={s_preview}
        />
        <NodeDeleteButton node_id={id} />
      </div>

      <div style={get_node_body_style()}>
        <div style={get_meta_style()}>
          Visible on canvas
        </div>

        <NodeDetailsSection s_title="Comment" s_meta="text and color" b_default_open={false}>
          <label>
            <span style={get_label_style()}>text</span>
            <textarea
              value={s_text}
              onChange={(o_event) => {
                update_node_data(id, { s_text: o_event.target.value });
              }}
              rows={4}
              style={{ ...get_input_style(), resize: "vertical" }}
            />
          </label>

          <label>
            <span style={get_label_style()}>color</span>
            <input
              value={s_color}
              onChange={(o_event) => {
                update_node_data(id, { s_color: o_event.target.value });
              }}
              style={get_input_style()}
            />
          </label>
        </NodeDetailsSection>
      </div>
    </div>
  );
}
