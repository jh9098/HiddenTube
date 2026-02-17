import React from "react";
import { NODE_DEFS } from "../workflow/nodeDefinitions.js";

export default function NodePalette() {
  const types = Object.keys(NODE_DEFS);

  const onDragStart = (evt, nodeType) => {
    evt.dataTransfer.setData("application/reactflow", nodeType);
    evt.dataTransfer.effectAllowed = "move";
  };

  return (
    <div>
      <div className="h1">노드 추가</div>
      <div className="small">드래그해서 캔버스에 놓으세요.</div>

      <div style={{ marginTop: 12 }}>
        {types.map((t) => {
          const def = NODE_DEFS[t];
          return (
            <div
              key={t}
              className="paletteItem"
              draggable
              onDragStart={(e) => onDragStart(e, t)}
              title="Drag to canvas"
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>{def.label}</div>
              <div className="small">{def.description}</div>
              <div className="badgeRow">
                <span className="badge">{def.category}</span>
                <span className="badge">{t}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h2">팁</div>
      <div className="card small">
        1) Input → Generate → Output 순으로 연결<br />
        2) Run 버튼을 누르면 순서대로 실행됩니다.<br />
        3) Save/Load로 로컬에 저장됩니다.
      </div>
    </div>
  );
}
