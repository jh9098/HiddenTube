import React from "react";
import RightExecutionPanel from "../panels/RightExecutionPanel";

function ProjectExecutionPanel({ workflow, projectTitle, setMessage }) {
  return (
    <RightExecutionPanel
      nodes={workflow.nodes}
      edges={workflow.edges}
      projectTitle={projectTitle}
      selectedNode={workflow.selectedNode}
      onSelectNode={workflow.setSelectedNodeId}
      onDeleteNode={(nodeId) => workflow.deleteNodesByIds([nodeId])}
      onRemoveIncomingConnection={(targetNodeId, sourceNodeId) => {
        workflow.removeIncomingEdge(targetNodeId, sourceNodeId);
        setMessage("연결 노드 토큰을 제거해 엣지를 해제했습니다.");
      }}
      onMessage={(nextMessage) => setMessage(nextMessage)}
      onStart={() => {
        const firstNodeId = workflow.nodes.find((node) => node.type === "ContentInputNode")?.id;
        if (!firstNodeId) {
          setMessage("시작할 내용입력 노드를 찾지 못했습니다.");
          return;
        }
        workflow.setSelectedNodeId(firstNodeId);
        setMessage("Preview 단계 실행을 시작했습니다.");
      }}
      onUpdateNodeLabel={(nodeId, nextLabel) => {
        workflow.updateNodeMeta(nodeId, "label", nextLabel);
      }}
      onUpdateNodePromptTemplate={(nodeId, promptTemplate) => {
        workflow.updateNodeConfig(nodeId, (currentConfig) => ({ ...currentConfig, promptTemplate }));
      }}
      onExecuteFromNode={(nodeId, manualOverrides) => {
        const manualResult = manualOverrides?.[nodeId] ?? "";
        if (!manualResult.trim()) {
          return { ok: false, message: "저장할 입력값이 비어 있어 전달할 수 없습니다." };
        }

        try {
          workflow.executeFromNode(nodeId, manualOverrides);
          setMessage("저장 후 다음 단계로 전달했습니다.");
          return { ok: true };
        } catch (error) {
          return { ok: false, message: `저장 실패: ${error.message}` };
        }
      }}
    />
  );
}

export default ProjectExecutionPanel;
