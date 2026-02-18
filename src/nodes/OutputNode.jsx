import React from "react";
import { Handle, Position } from "reactflow";
import NodeChrome from "./NodeChrome.jsx";

export default function OutputNode({ data }) {
  const title = data.config?.title || "Output";
  const preview = data.output?.final ? String(data.output.final) : (data.outputPreview || "최종 결과를 표시합니다.");

  return (
    <NodeChrome title={title} status={data.status} onToggleRun={data.onToggleRun} className="outputNodeCard">
      <div className="nodeMeta">
        <span>{data.config?.format || "text"}</span>
      </div>
      <div className="nodePreview">{preview}</div>
      <Handle type="target" position={Position.Left} className="connectionHandle" style={{ background: "#1dd1a1" }} />
    </NodeChrome>
  );
}
