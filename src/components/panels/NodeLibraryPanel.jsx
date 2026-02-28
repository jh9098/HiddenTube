import React from "react";
import { NODE_CATALOG } from "../../utils/workflowData";

function NodeLibraryPanel({ onAddNode }) {
  return (
    <aside className="side-panel">
      <h2>노드 추가</h2>
      <p className="panel-help">유튜브 생성 흐름에 필요한 기본 노드입니다.</p>
      <div className="node-library-list">
        {NODE_CATALOG.map((nodeType) => (
          <button
            key={nodeType.type}
            type="button"
            className="node-library-btn"
            onClick={() => onAddNode(nodeType.type)}
          >
            <strong>{nodeType.label}</strong>
            <span>{nodeType.description}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default NodeLibraryPanel;
