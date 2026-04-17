/* file: frontend/src/components/custom_edge.tsx
description: Kante mit Delete und Insert Funktion inklusive dynamischer Tool Nodes.
history:
- 2026-03-27: Marker Typ sicher angepasst. author Marcus Schlieper
- 2026-03-28: Erweitert fuer JSON definierte Tool Nodes. author Marcus Schlieper
*/

import { useMemo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { use_workflow_store } from "../store/workflow_store";
import { TNodeType } from "../types/workflow";
import { EdgeInsertMenu } from "./edge_insert_menu";
import { IToolNodeSchema } from "../types/tool_registry";

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps): JSX.Element {
  const { delete_edge, insert_node_on_edge } = use_workflow_store();
  const [b_show_menu, set_show_menu] = useState(false);

  const [s_edge_path, d_label_x, d_label_y] = useMemo(
    () =>
      getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
      }),
    [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]
  );

  function on_delete(): void {
    delete_edge(id);
  }

  function on_insert(s_type: TNodeType, o_tool_schema?: IToolNodeSchema): void {
    insert_node_on_edge(id, s_type, o_tool_schema);
    set_show_menu(false);
  }

  return (
    <>
      <BaseEdge id={id} path={s_edge_path} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${d_label_x}px,${d_label_y}px)`,
            pointerEvents: "all",
          }}
        >
          <button onClick={() => set_show_menu((b_prev) => !b_prev)} title="Node einfuegen">
            +
          </button>
          <button onClick={on_delete}>x</button>
          {b_show_menu && <EdgeInsertMenu on_select={on_insert} on_close={() => set_show_menu(false)} />}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
