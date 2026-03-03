import React, { useState } from "react";

export default function ManualRenderJsonInput({ onApply }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  const handleApply = () => {
    try {
      const parsed = JSON.parse(text);
      setErr("");
      onApply(parsed);
      setOpen(false);
    } catch (e) {
      setErr("JSON 파싱 실패: " + e.message);
    }
  };

  return (
    <div className="production-manual-render-json-wrap">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="production-manual-render-json-toggle"
      >
        {open ? "▲ 수동 render_json 입력 닫기" : "▼ 수동 render_json 직접 붙여넣기"}
      </button>
      {open && (
        <div className="production-manual-render-json-panel">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{"scenes": [...]} 형식으로 붙여넣으세요'
            className="production-manual-render-json-textarea"
          />
          {err && <div className="production-form-error">{err}</div>}
          <button
            type="button"
            onClick={handleApply}
            className="production-btn production-btn-secondary production-btn-block"
          >
            이 JSON으로 적용하기
          </button>
        </div>
      )}
    </div>
  );
}
