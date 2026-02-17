import React from "react";
import { Handle, Position } from "reactflow";

export default function OutputNode({ data }) {
  const dotClass =
    data.status === "success" ? "good" : data.status === "error" ? "bad" : data.status === "running" ? "warn" : "";

  const title = data.config?.title || "Output";
  const preview = data.output?.final ? String(data.output.final) : (data.outputPreview || "최종 결과를 표시합니다.");

  return (
    <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(29,209,161,0.08)", width: 300 }}>
      <div className="nodeTitle">{title}</div>
      <div className="nodeMeta">
        <span className="statusDot"><span className={`dot ${dotClass}`}></span>{data.status}</span>
        <span>{data.config?.format || "text"}</span>
      </div>
      <div className="nodePreview">{preview}</div>
      <Handle type="target" position={Position.Left} style={{ background: "#1dd1a1" }} />
    </div>
  );
}
