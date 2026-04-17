// file: frontend/src/components/workflow_canvas.tsx
// description: Einfache visuelle Darstellung der Nodes.
// history:
// - 2026-03-25: Erstellt fuer erste Canvas Ansicht. author Marcus Schlieper
import { i_workflow_node } from "../types/workflow";

interface i_workflow_canvas_props {
  nodes: i_workflow_node[];
}

export function WorkflowCanvas({ nodes }: i_workflow_canvas_props) {
  return (
    <div className="panel">
      <h2>Workflow Canvas</h2>
      {nodes.length === 0 ? (
        <div className="empty_state">No nodes yet</div>
      ) : (
        <div className="canvas_grid">
          {nodes.map((o_node) => (
            <div key={o_node.id} className={`node_card node_${o_node.type}`}>
              <div className="node_title">{o_node.type}</div>
              <div className="node_text">id: {o_node.id}</div>
              <div className="node_text">
                pos: {o_node.position.x}, {o_node.position.y}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
