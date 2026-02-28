import React, { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
} from "reactflow";

import WorkflowNode from "../nodes/WorkflowNode";
import TopToolbar from "../panels/TopToolbar";
import NodeLibraryPanel from "../panels/NodeLibraryPanel";
import RightExecutionPanel from "../panels/RightExecutionPanel";
import { useWorkflowState } from "../../store/useWorkflowState";

function WorkflowEditorBody() {
  const [message, setMessage] = useState("준비 완료");
  const workflow = useWorkflowState();

  const nodeTypes = useMemo(
    () => ({
      ContentInputNode: WorkflowNode,
      ScriptNode: WorkflowNode,
      SceneBreakdownNode: WorkflowNode,
      ImagePromptNode: WorkflowNode,
      MotionSubtitleNode: WorkflowNode,
      RenderJsonNode: WorkflowNode,
    }),
    []
  );

  const handleSave = () => {
    workflow.saveToLocalStorage();
    setMessage("로컬 저장소에 저장되었습니다.");
  };

  const handleLoad = () => {
    try {
      workflow.loadFromLocalStorage();
      setMessage("저장된 워크플로우를 불러왔습니다.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleTemplateLoad = () => {
    workflow.loadTemplateWorkflow();
    setMessage("예시 템플릿 워크플로우를 불러왔습니다.");
  };

  const handleExport = () => {
    const content = workflow.serializeCurrentWorkflow();
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hiddentube-workflow.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("JSON 파일로 내보냈습니다.");
  };

  const handleImport = (text) => {
    try {
      workflow.importFromJson(text);
      setMessage("JSON 파일에서 워크플로우를 가져왔습니다.");
    } catch (error) {
      setMessage(`가져오기 실패: ${error.message}`);
    }
  };

  return (
    <div className="workflow-layout">
      <TopToolbar
        onNew={workflow.resetWorkflow}
        onSave={handleSave}
        onLoad={handleLoad}
        onLoadTemplate={handleTemplateLoad}
        onExport={handleExport}
        onImport={handleImport}
        onExecuteAll={() => {
          workflow.executeAllNodes();
          setMessage("전체 노드를 실행해 프롬프트/출력을 갱신했습니다.");
        }}
        message={message}
      />
      <NodeLibraryPanel onAddNode={workflow.addNode} />
      <main className="canvas-area">
        <ReactFlow
          nodes={workflow.nodes}
          edges={workflow.edges}
          onNodesChange={workflow.onNodesChange}
          onEdgesChange={workflow.onEdgesChange}
          onConnect={workflow.onConnect}
          nodeTypes={nodeTypes}
          onSelectionChange={({ nodes }) => workflow.setSelectedNodeId(nodes?.[0]?.id ?? null)}
          fitView
        >
          <Background gap={20} size={1} />
          <MiniMap zoomable pannable />
          <Controls />
        </ReactFlow>
      </main>
      <RightExecutionPanel
        nodes={workflow.nodes}
        edges={workflow.edges}
        selectedNode={workflow.selectedNode}
        onSelectNode={workflow.setSelectedNodeId}
        onStart={() => {
          const firstNodeId = workflow.nodes.find((node) => node.type === "ContentInputNode")?.id;
          if (!firstNodeId) {
            setMessage("시작할 내용입력 노드를 찾지 못했습니다.");
            return;
          }
          workflow.setSelectedNodeId(firstNodeId);
          setMessage("내용입력 노드를 선택했습니다. Step 탭에서 내용을 입력하고 다음 단계로 진행하세요.");
        }}
        onUpdateNodeLabel={(nodeId, nextLabel) => {
          workflow.updateNodeMeta(nodeId, "label", nextLabel);
        }}
        onUpdateNodePromptTemplate={(nodeId, promptTemplate) => {
          workflow.updateNodeConfig(nodeId, (currentConfig) => ({ ...currentConfig, promptTemplate }));
        }}
        onUpdateNodeManualResult={(nodeId, manualResult) => {
          workflow.updateNodeManualResult(nodeId, manualResult);
          setMessage("사용자 응답을 저장했습니다.");
        }}
        onExecuteFromNode={(nodeId) => {
          workflow.executeFromNode(nodeId);
          setMessage("선택한 단계부터 하위 노드를 실행했습니다.");
        }}
      />
    </div>
  );
}

function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorBody />
    </ReactFlowProvider>
  );
}

export default WorkflowEditor;
