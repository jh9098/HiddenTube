import React, { useState } from "react";

export default function RenderJsonPreview({ renderJson }) {
  const [open, setOpen] = useState(false);
  const isEmpty = !renderJson || Object.keys(renderJson).length === 0;

  return (
    <div className="production-render-json-preview-wrap">
      <div
        className={`production-render-json-preview-head${isEmpty ? " is-empty" : ""}`}
        onClick={() => !isEmpty && setOpen(!open)}
        role="button"
        tabIndex={isEmpty ? -1 : 0}
        onKeyDown={(e) => {
          if (!isEmpty && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
      >
        <span className="production-render-json-preview-text">
          {isEmpty
            ? "📋 render_json 없음 (워크플로우 노드에서 생성하거나 수동으로 입력하세요)"
            : `📋 render_json (${(renderJson.scenes || []).length}개 씬)`}
        </span>
        {!isEmpty && (
          <span className="production-render-json-preview-arrow">{open ? "▲" : "▼"}</span>
        )}
      </div>
      {!isEmpty && open && (
        <pre className="production-render-json-preview-body">
          {JSON.stringify(renderJson, null, 2)}
        </pre>
      )}
    </div>
  );
}
