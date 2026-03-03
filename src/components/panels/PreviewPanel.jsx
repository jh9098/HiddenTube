import React, { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";
import { resolvePreviewPrompt } from "./previewPromptResolver";
import { buildPreviewFlow, getReadyNodeIds, getWaitingNodeIds } from "./previewFlow";
import { getStatusMeta } from "../status/statusMeta";
import { loadPreviewDraft, savePreviewDraft } from "./previewDraftStorage";
import { buildExecutionOrder, getNodeExecutionState } from "./executionPanelUtils";

function formatSavedTime(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function PreviewWorkspace({
  projectId,
  displayNodes,
  waitingNodes,
  nodes,
  edges,
  canUndoPreview,
  onExecuteFromNode,
  onMessage,
}) {
  const [manualResponses, setManualResponses] = useState({});
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState(null);

  useEffect(() => {
    setManualResponses((current) => {
      const next = { ...current };
      displayNodes.forEach((node) => {
        if (next[node.id] !== undefined) return;
        const draftValue = loadPreviewDraft(projectId, node.id);
        const nodeValue = node.data?.manualResult || "";
        next[node.id] = draftValue || nodeValue;
      });
      return next;
    });
  }, [displayNodes, projectId]);

  const handleCopyPrompt = async (node) => {
    const resolvedPrompt = resolvePreviewPrompt(node, nodes, edges, manualResponses);
    if (!resolvedPrompt?.trim()) {
      onMessage?.("복사할 프롬프트가 없습니다. 먼저 프롬프트를 생성해 주세요.");
      return;
    }

    try {
      await navigator.clipboard.writeText(resolvedPrompt);
      onMessage?.("프롬프트를 복사했습니다.");
    } catch {
      onMessage?.("프롬프트 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
    }
  };

  const handleManualResponseChange = (nodeId, value) => {
    setManualResponses((current) => ({ ...current, [nodeId]: value }));
    const saved = savePreviewDraft(projectId, nodeId, value);
    if (!saved) return;
    const now = Date.now();
    setLastDraftSavedAt(now);
    onMessage?.(`임시 저장됨 (${formatSavedTime(now)})`);
  };

  if (!displayNodes.length) {
    return <p className="panel-help">연결된 실행 노드가 없습니다. 노드 연결 상태를 확인해 주세요.</p>;
  }

  return (
    <section className="preview-workspace">
      <p className="console-subtitle">
        {canUndoPreview
          ? "중단 후 되돌리기를 누르면 마지막 임시 작성값을 복원합니다."
          : "입력값은 노드별로 임시 저장되어 탭 이동 후에도 유지됩니다."}
      </p>
      {lastDraftSavedAt && (
        <p className="draft-saved-badge">임시 저장됨: {formatSavedTime(lastDraftSavedAt)}</p>
      )}

      {displayNodes.map((node) => {
        const isContentInputNode = node.type === "ContentInputNode";
        const manualResponse = manualResponses[node.id] ?? "";
        const statusMeta = getStatusMeta(getNodeExecutionState(node));

        return (
          <article key={node.id} className="console-item">
            <header>
              <h4>{node.data?.label}</h4>
              <span className={`status-badge ${statusMeta.className}`}>
                <span aria-hidden="true">{statusMeta.icon}</span> {statusMeta.label}
              </span>
            </header>

            {!isContentInputNode && (
              <div className="step-action-row">
                <Button type="button" variant="outline" size="sm" onClick={() => handleCopyPrompt(node)}>
                  프롬프트 복사
                </Button>
              </div>
            )}

            <div className="field">
              <label>{isContentInputNode ? "내용 입력" : "답변 입력"}</label>
              <textarea
                className="config-editor"
                placeholder={isContentInputNode ? "여기에 초안 내용을 입력하세요." : "AI 답변을 붙여넣어 주세요."}
                value={manualResponse}
                onChange={(event) => handleManualResponseChange(node.id, event.target.value)}
              />
            </div>

            <div className="step-action-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const result = await onExecuteFromNode(node.id, { [node.id]: manualResponse });
                  if (!result?.ok) {
                    onMessage?.(result?.message || "저장에 실패해 다음 단계로 전달할 수 없습니다.");
                    return;
                  }
                  onMessage?.("저장 후 다음으로 전달했습니다.");
                }}
              >
                저장 후 다음으로 전달
              </Button>
            </div>
          </article>
        );
      })}

      {waitingNodes.length > 0 && (
        <article className="console-item waiting-node-box">
          <h4>대기 중 노드</h4>
          <p className="console-subtitle">아직 전달 조건이 충족되지 않은 노드입니다.</p>
          <ul className="waiting-node-list">
            {waitingNodes.map((node) => (
              <li key={node.id}>{node.data?.label || "노드"}</li>
            ))}
          </ul>
        </article>
      )}
    </section>
  );
}

function PreviewPanel(props) {
  const {
    projectId,
    nodes,
    edges,
    projectTitle,
    onStart,
    onCancel,
    hasStarted,
    canUndoPreview,
    onUndoPreview,
    onExecuteFromNode,
    onMessage,
  } = props;
  const orderedNodeIds = useMemo(() => buildExecutionOrder(nodes, edges), [nodes, edges]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const orderedNodes = orderedNodeIds.map((nodeId) => nodeMap.get(nodeId)).filter(Boolean);
  const [deliveredNodeIds, setDeliveredNodeIds] = useState([]);
  const [lastSnapshot, setLastSnapshot] = useState(null);

  const previewFlow = useMemo(() => buildPreviewFlow(nodes, edges), [nodes, edges]);

  useEffect(() => {
    if (!hasStarted) return;
    setDeliveredNodeIds((current) => current.filter((nodeId) => previewFlow.nodeById.has(nodeId)));
  }, [hasStarted, previewFlow]);

  const visibleNodeIds = useMemo(() => {
    if (!hasStarted) return [];
    const readyNodeIds = getReadyNodeIds(previewFlow, deliveredNodeIds);
    return [...previewFlow.contentInputNodeIds, ...readyNodeIds];
  }, [deliveredNodeIds, hasStarted, previewFlow]);

  const waitingNodeIds = useMemo(() => {
    if (!hasStarted) return [];
    return getWaitingNodeIds(previewFlow, deliveredNodeIds);
  }, [deliveredNodeIds, hasStarted, previewFlow]);

  const displayNodes = useMemo(
    () => orderedNodes.filter((node) => visibleNodeIds.includes(node.id)),
    [orderedNodes, visibleNodeIds]
  );

  const waitingNodes = useMemo(
    () => orderedNodes.filter((node) => waitingNodeIds.includes(node.id)),
    [orderedNodes, waitingNodeIds]
  );

  const handleDeliver = async (nodeId, manualOverrides) => {
    const result = await onExecuteFromNode(nodeId, manualOverrides);
    if (!result?.ok) return result;
    setDeliveredNodeIds((current) => (current.includes(nodeId) ? current : [...current, nodeId]));
    return result;
  };

  return (
    <div className="execution-pane preview-pane" data-panel-first-focus="true">
      <div className="preview-hero">
        <div className="preview-logo" />
        <div className="preview-hero-title-box">
          <h3>{projectTitle || "Untitled Project"}</h3>
          {!hasStarted ? (
            <Button type="button" className="start-btn" onClick={onStart}>✦ 시작하기</Button>
          ) : (
            <Button type="button" className="start-btn" variant="outline" onClick={() => {
              setLastSnapshot(deliveredNodeIds);
              setDeliveredNodeIds([]);
              onCancel();
            }}>중단하기</Button>
          )}
          {!hasStarted && canUndoPreview && (
            <Button type="button" size="sm" variant="ghost" onClick={() => {
              if (!lastSnapshot) return;
              setDeliveredNodeIds(lastSnapshot);
              onUndoPreview();
              setLastSnapshot(null);
            }}>
              취소 되돌리기
            </Button>
          )}
        </div>
      </div>

      {!hasStarted && <p className="panel-help">시작하기를 누르면 내용 입력 단계가 시작됩니다.</p>}

      {hasStarted && (
        <PreviewWorkspace
          projectId={projectId}
          displayNodes={displayNodes}
          waitingNodes={waitingNodes}
          nodes={nodes}
          edges={edges}
          canUndoPreview={canUndoPreview}
          onExecuteFromNode={handleDeliver}
          onMessage={onMessage}
        />
      )}
    </div>
  );
}

export default PreviewPanel;
