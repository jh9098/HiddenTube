import React from "react";
import { Handle, Position } from "reactflow";

function dotClass(status) {
  if (status === "done") return "good";
  if (status === "doing") return "warn";
  if (status === "error") return "bad";
  return "";
}

export default function AssetNode({ data }) {
  const title = data.config?.title || "Asset";
  const key = data.config?.assetKey || "asset";
  const source = data.config?.source || "upload";

  return (
    <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", width: 300 }}>
      <div className="nodeTitle">{data.label}</div>
      <div className="nodeMeta">
        <span className="statusDot"><span className={`dot ${dotClass(data.status)}`}></span>{data.status}</span>
        <span>{source} · {key}</span>
      </div>

      <div className="nodePreview">
        <b>{title}</b>
        <div style={{ marginTop: 6, color: "#d7d7e0", fontSize: 11, whiteSpace: "pre-wrap" }}>
          {data.outputPreview || "파일/링크/텍스트를 저장해 변수로 내려보내세요."}
        </div>
      </div>

      <Handle type="target" position={Position.Left} style={{ background: "#7c5cff" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#7c5cff" }} />
    </div>
  );
}
