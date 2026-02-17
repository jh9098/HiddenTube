import React from "react";
import { Handle, Position } from "reactflow";

function dotClass(status) {
  if (status === "done") return "good";
  if (status === "doing") return "warn";
  if (status === "error") return "bad";
  return "";
}

export default function GenerateNode({ data }) {
  const role = data.config?.roleType || "";
  const model = data.config?.modelId || "";
  const provider = data.config?.provider || "";

  return (
    <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(124,92,255,0.10)", width: 300 }}>
      <div className="nodeTitle">{data.label}</div>
      <div className="nodeMeta">
        <span className="statusDot"><span className={`dot ${dotClass(data.status)}`}></span>{data.status}</span>
        <span>{role} · {model}</span>
      </div>

      <div className="small" style={{ marginTop: 6 }}>
        Provider: <b style={{ color: "#e8e8ea" }}>{provider}</b> · outputKey: <b style={{ color: "#e8e8ea" }}>{data.config?.outputKey || "result"}</b>
      </div>

      <div className="nodePreview">
        {data.outputPreview || "초기 MVP: 프롬프트 복사 → AI 결과 붙여넣기 → Apply(완료)."}
      </div>

      <Handle type="target" position={Position.Left} style={{ background: "#7c5cff" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#7c5cff" }} />
    </div>
  );
}
