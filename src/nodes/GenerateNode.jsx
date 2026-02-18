import React from "react";
import { Handle, Position } from "reactflow";
import NodeChrome from "./NodeChrome.jsx";

export default function GenerateNode({ data }) {
  const model = data.config?.modelId || "";
  const promptFirst = (data.config?.prompt || "").split("\n")[0];

  return (
    <NodeChrome title={data.label} status={data.status} onToggleRun={data.onToggleRun} className="generateNodeCard">
      <div className="nodeMeta">
        <span>{model}</span>
      </div>

      <div className="nodePreview">
        {data.outputPreview || (promptFirst ? `prompt: ${promptFirst}` : "prompt를 입력하세요")}
      </div>

      <Handle type="target" position={Position.Left} className="connectionHandle" style={{ background: "#7c5cff" }} />
      <Handle type="source" position={Position.Right} className="connectionHandle" style={{ background: "#7c5cff" }} />
    </NodeChrome>
  );
}
