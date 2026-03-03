import React, { useRef } from "react";
import Button from "../ui/Button";

function TopToolbar({
  onHome,
  onNew,
  onSave,
  onLoad,
  onLoadTemplate,
  onExport,
  onImport,
  onExecuteAll,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  message,
  projectTitle,
  onProjectTitleChange,
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
      <button type="button" className="toolbar-brand toolbar-home-btn" onClick={onHome}>
        HiddenTube
      </button>
      <input
        className="toolbar-project-title-input"
        value={projectTitle}
        placeholder="프로젝트 제목을 입력하세요"
        onChange={(event) => onProjectTitleChange(event.target.value)}
      />
      <Button variant="outline" onClick={onNew}>
        새 워크플로우
      </Button>
      <Button variant="outline" onClick={onUndo} disabled={!canUndo}>
        Undo
      </Button>
      <Button variant="outline" onClick={onRedo} disabled={!canRedo}>
        Redo
      </Button>
      <Button variant="outline" onClick={onSave}>
        저장
      </Button>
      <Button variant="outline" onClick={onLoad}>
        불러오기
      </Button>
      <Button variant="outline" onClick={onLoadTemplate}>
        예시 템플릿
      </Button>
      <Button variant="outline" onClick={onExport}>
        JSON 내보내기
      </Button>
      <Button onClick={onExecuteAll}>
        전체 프롬프트 실행
      </Button>
      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
        JSON 가져오기
      </Button>
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
