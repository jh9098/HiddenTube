import React from "react";
import { Handle, Position } from "reactflow";
import NodeChrome from "./NodeChrome.jsx";

export default function AssetNode({ data }) {
  const title = data.config?.title || "Asset";
  const key = data.config?.assetKey || "asset";
  const source = data.config?.source || "upload";

  return (
    <NodeChrome title={data.label} status={data.status} onToggleRun={data.onToggleRun} className="assetNodeCard">
      <div className="nodeMeta">
        <span>{source} · {key}</span>
      </div>

      <div className="nodePreview">
        <b>{title}</b>
        <div style={{ marginTop: 6, color: "#d7d7e0", fontSize: 11, whiteSpace: "pre-wrap" }}>
          {data.outputPreview || "파일/링크/텍스트를 저장해 변수로 전달하세요."}
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="connectionHandle" style={{ background: "#7c5cff" }} />
      <Handle type="source" position={Position.Right} className="connectionHandle" style={{ background: "#7c5cff" }} />
    </NodeChrome>
  );
}
