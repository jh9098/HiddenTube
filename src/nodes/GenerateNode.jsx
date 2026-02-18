import React from "react";
import { Handle, Position } from "reactflow";

function dotClass(status) {
  if (status === "done") return "good";
  if (status === "doing") return "warn";
  if (status === "error") return "bad";
  return "";
}

export default function GenerateNode({ data }) {
  const model = data.config?.modelId || "";
  const promptFirst = (data.config?.prompt || "").split("\n")[0];

  return (
    <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(124,92,255,0.10)", width: 320 }}>
      <div className="nodeTitle">{data.label}</div>
      <div className="nodeMeta">
        <span className="statusDot"><span className={`dot ${dotClass(data.status)}`}></span>{data.status}</span>
        <span>{model}</span>
      </div>

      <div className="small" style={{ marginTop: 6 }}>
        prompt + 연결 답변 기반 실행
      </div>

      <div className="nodePreview">
        {data.outputPreview || (promptFirst ? `prompt: ${promptFirst}` : "prompt를 입력하세요 → 프롬프트 복사 → 결과 붙여넣기")}
      </div>

      <Handle type="target" position={Position.Left} className="connectionHandle" style={{ background: "#7c5cff" }} />
      <Handle type="source" position={Position.Right} className="connectionHandle" style={{ background: "#7c5cff" }} />
    </div>
  );
}
