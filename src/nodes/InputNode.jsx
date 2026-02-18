import React from "react";
import { Handle, Position } from "reactflow";
import NodeChrome from "./NodeChrome.jsx";

export default function InputNode({ data }) {
  const guideText = (data.config?.value || "").trim() || "주제와 타깃을 입력하세요";
  const inputValue = String(data.config?.userValue ?? "").trim();

  return (
    <NodeChrome title={data.label} status={data.status} onToggleRun={data.onToggleRun} className="inputNodeCard">
      <div className="nodePreview">{guideText}</div>
      <div className="nodeMeta" style={{ marginTop: 8 }}>
        <span>{inputValue ? "입력됨" : "입력 대기"}</span>
      </div>
      <Handle type="source" position={Position.Right} className="connectionHandle" style={{ background: "#7c5cff" }} />
    </NodeChrome>
  );
}
