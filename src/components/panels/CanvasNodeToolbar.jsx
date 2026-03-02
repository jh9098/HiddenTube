import React from "react";
import { NODE_CATALOG } from "../../utils/workflowData";
import Button from "../ui/Button";

function CanvasNodeToolbar({ onAddNode }) {
  return (
    <div className="canvas-node-toolbar" role="toolbar" aria-label="노드 추가 도구 모음">
      {NODE_CATALOG.map((nodeType) => (
        <Button
          key={nodeType.type}
          type="button"
          variant="outline"
          size="sm"
          className="canvas-node-toolbar-btn"
          onClick={() => onAddNode(nodeType.type)}
        >
          {nodeType.label}
        </Button>
      ))}
    </div>
  );
}

export default CanvasNodeToolbar;
