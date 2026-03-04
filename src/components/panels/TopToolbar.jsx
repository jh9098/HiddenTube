import React, { useEffect, useRef, useState } from "react";
import Button from "../ui/Button";

function TopToolbar({
  onHome,
  onNew,
  onSave,
  onLoad,
  onLoadTemplate,
  onExport,
  onImport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  message,
  projectTitle,
  onProjectTitleChange,
}) {
  const fileInputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 768px)").matches);
  const [isMessageExpanded, setIsMessageExpanded] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => setIsMobile(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onImport(text);
    event.target.value = "";
  };

  const allActions = (
    <>
      <Button variant="outline" onClick={onNew}>
        워크플로우 새로 만들기
      </Button>
      <Button variant="ghost" onClick={onUndo} disabled={!canUndo}>
        되돌리기
      </Button>
      <Button variant="ghost" onClick={onRedo} disabled={!canRedo}>
        다시 적용하기
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
    </>
  );

  return (
    <header className="top-toolbar">
      <div className="toolbar-main-row">
        <button type="button" className="toolbar-brand toolbar-home-btn" onClick={onHome}>
          HiddenTube
        </button>
        <Button variant="outline" onClick={onSave}>
          저장하기
        </Button>
        {isMobile ? (
          <details className="toolbar-more-menu">
            <summary>⋯ 더보기</summary>
            <div className="toolbar-more-menu-content">{allActions}</div>
          </details>
        ) : (
          <>
            <div className="toolbar-group-separator" aria-hidden="true" />
            <div className="toolbar-action-group">{allActions}</div>
          </>
        )}
      </div>

      <input
        className="toolbar-project-title-input"
        value={projectTitle}
        placeholder="프로젝트 제목을 입력하세요"
        onChange={(event) => onProjectTitleChange(event.target.value)}
      />

      <input
        ref={fileInputRef}
        hidden
        type="file"
        accept="application/json"
        onChange={handleFileChange}
      />

      <div className="toolbar-message">
        <span className={isMobile && !isMessageExpanded ? "toolbar-message-summary" : undefined}>{message}</span>
        {isMobile ? (
          <button type="button" className="toolbar-message-toggle" onClick={() => setIsMessageExpanded((prev) => !prev)}>
            {isMessageExpanded ? "접기" : "펼치기"}
          </button>
        ) : null}
      </div>
    </header>
  );
}

export default TopToolbar;
