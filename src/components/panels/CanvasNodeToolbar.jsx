import React, { useEffect, useMemo, useState } from "react";
import { NODE_CATALOG } from "../../utils/workflowData";
import Button from "../ui/Button";

function getNodeShortLabel(label) {
  return label.split(/[+\s/]/)[0] || label;
}

function CanvasNodeToolbar({ onAddNode }) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 768px)").matches);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => setIsMobile(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(""), 1500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const catalogWithShortLabel = useMemo(
    () => NODE_CATALOG.map((nodeType) => ({ ...nodeType, shortLabel: getNodeShortLabel(nodeType.label) })),
    []
  );

  const handleAddNode = (nodeType) => {
    onAddNode(nodeType.type);
    setToastMessage(`${nodeType.label} 노드를 추가했어요.`);
    setIsSheetOpen(false);
  };

  if (!isMobile) {
    return (
      <div className="canvas-node-toolbar" role="toolbar" aria-label="노드 추가 도구 모음">
        {catalogWithShortLabel.map((nodeType) => (
          <Button
            key={nodeType.type}
            type="button"
            variant="outline"
            size="sm"
            className="canvas-node-toolbar-btn"
            onClick={() => handleAddNode(nodeType)}
          >
            {nodeType.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="canvas-node-fab"
        onClick={() => setIsSheetOpen((prev) => !prev)}
        aria-expanded={isSheetOpen}
        aria-controls="mobile-node-sheet"
      >
        + 노드 추가
      </button>

      <div className={`mobile-node-sheet-backdrop ${isSheetOpen ? "open" : ""}`} onClick={() => setIsSheetOpen(false)} aria-hidden="true" />

      <section id="mobile-node-sheet" className={`mobile-node-sheet ${isSheetOpen ? "open" : ""}`} aria-label="노드 추가 목록">
        <header className="mobile-node-sheet-header">
          <strong>노드 추가</strong>
          <button type="button" onClick={() => setIsSheetOpen(false)}>
            닫기
          </button>
        </header>

        <div className="mobile-node-sheet-list">
          {catalogWithShortLabel.map((nodeType) => (
            <button key={nodeType.type} type="button" className="mobile-node-item" onClick={() => handleAddNode(nodeType)}>
              <span className="mobile-node-item-icon">{nodeType.shortLabel.slice(0, 1)}</span>
              <span className="mobile-node-item-text">
                <strong>{nodeType.shortLabel}</strong>
                <small>{nodeType.description}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {toastMessage ? <p className="canvas-toast">{toastMessage}</p> : null}
    </>
  );
}

export default CanvasNodeToolbar;
