import React from "react";
import { Handle, Position } from "reactflow";

function WorkflowNode({ id, data, selected }) {
  const handleDetachIncoming = (event) => {
    event.stopPropagation();
    data?.onDetachIncoming?.(id);
  };

  return (
    <div className={`workflow-node ui-card ${selected ? "selected" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="workflow-handle-target"
        onMouseDown={handleDetachIncoming}
        onTouchStart={handleDetachIncoming}
        title="입력 연결 끊기"
      />
      <div className="workflow-node-title">{data.label}</div>
      <div className="workflow-node-desc">{data.description}</div>
      <div className={`workflow-node-status status-${data.status}`}>{data.status}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default WorkflowNode;
