import React from "react";

function PaletteItem({ type, title, desc, badges }) {
  const onDragStart = (event) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="paletteItem" draggable onDragStart={onDragStart}>
      <div style={{ fontWeight: 800, fontSize: 13 }}>{title}</div>
      <div className="small">{desc}</div>
      <div className="badgeRow">
        {badges.map((b) => (
          <span className="badge" key={b}>{b}</span>
        ))}
      </div>
    </div>
  );
}

export default function NodePalette() {
  return (
    <div>
      <div className="h1">Nodes</div>

      <PaletteItem
        type="input"
        title="Input"
        desc="주제/키워드 입력. 자동으로 변수로 내려감."
        badges={["topic", "seed"]}
      />
      <PaletteItem
        type="generate"
        title="Generate (Manual)"
        desc="할 일을 자유 입력 → 프롬프트 복사 → 결과 붙여넣기/업로드."
        badges={["todo", "prompt", "manual"]}
      />
      <PaletteItem
        type="asset"
        title="Asset"
        desc="외부자료/파일/링크/텍스트를 변수로 저장."
        badges={["upload", "url", "text"]}
      />
      <PaletteItem
        type="output"
        title="Output"
        desc="최종 결과 표시(업스트림 변수 모아서 보기)."
        badges={["final", "view"]}
      />

      <div className="card small" style={{ marginTop: 10 }}>
        Drag & Drop으로 캔버스에 추가하세요.
      </div>
    </div>
  );
}
