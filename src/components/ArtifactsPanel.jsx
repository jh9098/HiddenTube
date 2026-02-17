import React, { useMemo } from "react";
import { collectArtifactsFromNodes } from "../workflow/runner.js";

export default function ArtifactsPanel({ nodes, onSelectNode }) {
  const artifacts = useMemo(() => collectArtifactsFromNodes(nodes), [nodes]);

  return (
    <div>
      <div className="h1">Artifacts</div>
      <div className="card small">
        업로드/URL/텍스트 결과를 한 곳에 모아봅니다. (초기 MVP: 파일은 메타 저장)
      </div>

      <div className="h2">Items</div>
      <div className="card" style={{ maxHeight: 420, overflow: "auto" }}>
        {artifacts.length ? (
          artifacts.map((a, idx) => (
            <div
              key={`${a.nodeId}-${a.kind}-${idx}`}
              style={{
                padding: "10px 0",
                borderBottom: "1px dashed rgba(255,255,255,0.08)",
                display: "grid",
                gridTemplateColumns: "1fr 90px",
                gap: 10,
                alignItems: "start",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 12 }}>
                  [{a.kind}] {a.title}
                </div>
                <div className="small">key: {a.key} · source: {a.source}</div>
                {a.kind === "url" ? (
                  <div style={{ marginTop: 6 }}>
                    <a href={a.value} target="_blank" rel="noreferrer">{a.value}</a>
                  </div>
                ) : (
                  <div className="small" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                    {a.value}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => onSelectNode(a.nodeId)}>Open</button>
              </div>
            </div>
          ))
        ) : (
          <div className="small">아직 아티팩트가 없습니다. Generate/Asset 노드에서 업로드/URL/텍스트를 추가하세요.</div>
        )}
      </div>
    </div>
  );
}
