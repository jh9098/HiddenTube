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
import NodeInspectorPanel from "../panels/NodeInspectorPanel";
import ProjectAssetsPanel from "../project/ProjectAssetsPanel";
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
      <NodeInspectorPanel
        selectedNode={workflow.selectedNode}
        onDelete={workflow.deleteSelectedNode}
        onUpdateMeta={workflow.updateSelectedNodeMeta}
        onUpdateConfig={workflow.updateSelectedNodeConfigText}
        onUpdateManualResult={workflow.updateSelectedNodeManualResult}
        onUpdateStatus={workflow.updateSelectedNodeStatus}
        onExecuteNode={() => {
          workflow.executeSelectedNodeOnly();
          setMessage("선택 노드를 실행했습니다.");
        }}
        onExecuteFromNode={() => {
          workflow.executeFromSelectedNode();
          setMessage("선택 노드부터 하위 노드까지 실행했습니다.");
        }}
        onCopyPromptPackage={async () => {
          try {
            await workflow.copyPromptPackage();
            setMessage("전체 프롬프트 패키지를 클립보드에 복사했습니다.");
          } catch (error) {
            setMessage(`복사 실패: ${error.message}`);
          }
        }}
        projectPanel={<ProjectAssetsPanel nodes={workflow.nodes} edges={workflow.edges} onMessage={setMessage} />}
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
