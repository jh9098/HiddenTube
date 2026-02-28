import React, { useRef } from "react";

function TopToolbar({
  onNew,
  onSave,
  onLoad,
  onLoadTemplate,
  onExport,
  onImport,
  onExecuteAll,
  message,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onImport(text);
    event.target.value = "";
  };

  return (
    <header className="top-toolbar">
      <div className="toolbar-brand">HiddenTube · Workflow Builder</div>
      <button type="button" className="toolbar-btn" onClick={onNew}>
        새 워크플로우
      </button>
      <button type="button" className="toolbar-btn" onClick={onSave}>
        저장
      </button>
      <button type="button" className="toolbar-btn" onClick={onLoad}>
        불러오기
      </button>
      <button type="button" className="toolbar-btn" onClick={onLoadTemplate}>
        예시 템플릿
      </button>
      <button type="button" className="toolbar-btn" onClick={onExport}>
        JSON 내보내기
      </button>
      <button type="button" className="toolbar-btn" onClick={onExecuteAll}>
        전체 프롬프트 실행
      </button>
      <button
        type="button"
        className="toolbar-btn"
        onClick={() => fileInputRef.current?.click()}
      >
        JSON 가져오기
      </button>
      <input
        ref={fileInputRef}
        hidden
        type="file"
        accept="application/json"
        onChange={handleFileChange}
      />
      <div className="toolbar-message">{message}</div>
    </header>
  );
}

export default TopToolbar;
