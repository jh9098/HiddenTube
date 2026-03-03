import React, { useMemo } from "react";
import Button from "../ui/Button";
import PromptTokenEditor from "./PromptTokenEditor";
import { toMentionToken } from "./promptMentionTokens";

function StepPanel({
  selectedNode,
  nodes,
  edges,
  onUpdateNodeLabel,
  onUpdateNodePromptTemplate,
  onDeleteNode,
  onRemoveIncomingConnection,
}) {
  if (!selectedNode) {
    return <p className="panel-help">노드를 선택하면 Step 탭이 활성화됩니다.</p>;
  }

  const promptTemplate = selectedNode.data?.config?.promptTemplate || "";
  const incomingNodes = useMemo(() => {
    const sourceNodeById = new Map(nodes.map((node) => [node.id, node]));
    return edges
      .filter((edge) => edge.target === selectedNode.id)
      .map((edge) => sourceNodeById.get(edge.source))
      .filter(Boolean)
      .map((node) => ({ id: node.id, label: node.data?.label || "노드" }));
  }, [edges, nodes, selectedNode.id]);

  return (
    <div className="execution-pane" data-panel-first-focus="true">
      <h3 className="execution-node-title">✦ {selectedNode.data?.label}</h3>
      <div className="field">
        <label>노드 제목</label>
        <input value={selectedNode.data?.label || ""} onChange={(event) => onUpdateNodeLabel(selectedNode.id, event.target.value)} />
      </div>
      <div className="field">
        <label>명령어(Prompt)</label>
        <div className="prompt-editor-box">
          <PromptTokenEditor
            value={promptTemplate}
            mentionOptions={incomingNodes}
            onChange={(nextValue) => onUpdateNodePromptTemplate(selectedNode.id, nextValue)}
          />
          <div className="mention-token-list" role="list" aria-label="연결 노드 목록">
            {incomingNodes.map((node) => (
              <div key={node.id} className="mention-chip" role="listitem" title={`${node.label} 연결됨`}>
                <span className="mention-chip-icon" aria-hidden="true">🔗</span>
                <span className="mention-chip-label">{node.label}</span>
                <span className="mention-chip-token">{toMentionToken(node.label)}</span>
                <button
                  type="button"
                  className="mention-chip-remove"
                  aria-label={`${node.label} 연결 해제`}
                  onClick={() => onRemoveIncomingConnection(selectedNode.id, node.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
        <p className="panel-help">
          상단 토큰 버튼을 누르면 커서 위치에 참조 아이콘이 삽입됩니다. 한글 IME 타이핑도 일반 입력처럼 동작합니다.
        </p>
      </div>
      <div className="step-action-row">
        <Button type="button" variant="destructive" onClick={() => onDeleteNode(selectedNode.id)}>
          이 Step 노드 삭제
        </Button>
      </div>
    </div>
  );
}

export default StepPanel;
