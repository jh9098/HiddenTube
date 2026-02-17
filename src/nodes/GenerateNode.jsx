import React from "react";
import { Handle, Position } from "reactflow";

export default function GenerateNode({ data }) {
  const dotClass =
    data.status === "success" ? "good" : data.status === "error" ? "bad" : data.status === "running" ? "warn" : "";

  return (
    <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(124,92,255,0.10)", width: 280 }}>
      <div className="nodeTitle">{data.label}</div>
      <div className="nodeMeta">
        <span className="statusDot"><span className={`dot ${dotClass}`}></span>{data.status}</span>
        <span>{data.config?.model || "model"}</span>
      </div>
      <div className="nodePreview">{data.outputPreview || "실행하면 결과 프리뷰가 보입니다."}</div>
      <Handle type="target" position={Position.Left} style={{ background: "#7c5cff" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#7c5cff" }} />
    </div>
  );
}
