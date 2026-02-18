import React from "react";
import { Handle, Position } from "reactflow";

function dotClass(status) {
  if (status === "done") return "good";
  if (status === "doing") return "warn";
  if (status === "error") return "bad";
  return "";
}

export default function InputNode({ data }) {
  return (
    <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", width: 260 }}>
      <div className="nodeTitle">{data.label}</div>
      <div className="nodeMeta">
        <span className="statusDot"><span className={`dot ${dotClass(data.status)}`}></span>{data.status}</span>
      </div>
      <div className="nodePreview">
        <div><b>안내:</b> {String(data.config?.value ?? "")}</div>
        <div style={{ marginTop: 4 }}><b>입력값:</b> {String(data.config?.userValue ?? "") || "(미입력)"}</div>
      </div>
      <Handle type="source" position={Position.Right} className="connectionHandle" style={{ background: "#7c5cff" }} />
    </div>
  );
}
