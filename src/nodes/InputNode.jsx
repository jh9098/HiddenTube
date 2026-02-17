import React from "react";
import { Handle, Position } from "reactflow";

export default function InputNode({ data }) {
  const dotClass =
    data.status === "success" ? "good" : data.status === "error" ? "bad" : data.status === "running" ? "warn" : "";

  return (
    <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", width: 260 }}>
      <div className="nodeTitle">{data.label}</div>
      <div className="nodeMeta">
        <span className="statusDot"><span className={`dot ${dotClass}`}></span>{data.status}</span>
        <span>{data.config?.key || "key"}</span>
      </div>
      <div className="nodePreview">{String(data.config?.value ?? "")}</div>
      <Handle type="source" position={Position.Right} style={{ background: "#7c5cff" }} />
    </div>
  );
}
