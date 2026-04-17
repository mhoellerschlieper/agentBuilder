/* file: frontend/src/components/node_delete_button.tsx
description: Kleiner Delete Button fuer Nodes rechts oben.
history:
- 2026-03-27: Erstellt fuer direktes Loeschen von Nodes. author Marcus Schlieper
- 2026-03-28: Styling verbessert fuer sichere Darstellung auf allen Node Typen. author Marcus Schlieper
author Marcus Schlieper
*/
import { MouseEvent } from "react";
import { use_workflow_store } from "../store/workflow_store";

interface INodeDeleteButtonProps {
  s_node_id: string;
}

export function NodeDeleteButton({
  s_node_id,
}: INodeDeleteButtonProps): JSX.Element {
  const { delete_node } = use_workflow_store();

  function on_click(o_event: MouseEvent): void {
    o_event.stopPropagation();
    delete_node(s_node_id);
  }

  return (
    <button
      type="button"
      onClick={on_click}
      title="Delete node"
      style={{
        position: "absolute",
        top: "8px",
        right: "8px",
        width: "22px",
        height: "22px",
        border: "1px solid #cbd5e1",
        borderRadius: "999px",
        backgroundColor: "#ffffff",
        color: "#475569",
        fontSize: "12px",
        lineHeight: 1,
        cursor: "pointer",
        zIndex: 20,
      }}
    >
      x
    </button>
  );
}
