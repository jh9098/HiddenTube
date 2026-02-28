import React from "react";
import { Handle, Position } from "reactflow";

function WorkflowNode({ data, selected }) {
  return (
    <div className={`workflow-node ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div className="workflow-node-title">{data.label}</div>
      <div className="workflow-node-desc">{data.description}</div>
      <div className={`workflow-node-status status-${data.status}`}>{data.status}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default WorkflowNode;
