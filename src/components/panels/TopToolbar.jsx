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
      <div className="toolbar-action-group">
        <Button variant="outline" onClick={onNew}>
          워크플로우 새로 만들기
        </Button>
        <Button variant="ghost" onClick={onUndo} disabled={!canUndo}>
          되돌리기
        </Button>
        <Button variant="ghost" onClick={onRedo} disabled={!canRedo}>
          다시 적용하기
        </Button>
      </div>
      <div className="toolbar-group-separator" aria-hidden="true" />
      <div className="toolbar-action-group">
        <Button onClick={onExecuteAll}>전체 프롬프트 실행하기</Button>
      </div>
      <div className="toolbar-group-separator" aria-hidden="true" />
      <div className="toolbar-action-group">
        <Button variant="outline" onClick={onSave}>
          저장하기
        </Button>
        <Button variant="outline" onClick={onLoad}>
          불러오기
        </Button>
        <Button variant="ghost" onClick={onLoadTemplate}>
          템플릿 적용하기
        </Button>
        <Button variant="outline" onClick={onExport}>
          JSON 내보내기
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          JSON 가져오기
        </Button>
      </div>
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
