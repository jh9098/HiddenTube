import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap, ReactFlowProvider } from "reactflow";
import { useNavigate } from "react-router-dom";

import WorkflowNode from "../nodes/WorkflowNode";
import TopToolbar from "../panels/TopToolbar";
import CanvasNodeToolbar from "../panels/CanvasNodeToolbar";
import { useWorkflowState } from "../../store/useWorkflowState";
import {
  getProject,
  getProjectStorageKeys,
  loadProjectWorkflow,
  saveProjectWorkflow,
  updateProjectTitle,
} from "../../lib/projectStorage";
import ProjectExecutionPanel from "./ProjectExecutionPanel";
import { useEditorKeyboardShortcuts } from "./useEditorKeyboardShortcuts";

function WorkflowEditorBody({ projectId }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("프로젝트 준비 완료");
  const [projectTitle, setProjectTitle] = useState("Untitled Project");
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 768px)").matches);

  const storageKeys = useMemo(() => getProjectStorageKeys(projectId), [projectId]);
  const workflow = useWorkflowState(storageKeys);

  useEditorKeyboardShortcuts(workflow);

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

  const nodesWithActions = useMemo(
    () =>
      workflow.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onDetachIncoming: workflow.detachIncomingEdges,
        },
      })),
    [workflow.detachIncomingEdges, workflow.nodes]
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => setIsMobile(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleSave = () => {
    const content = workflow.serializeCurrentWorkflow();
    saveProjectWorkflow(projectId, content, projectTitle);
    setMessage("현재 프로젝트에 저장되었습니다.");
  };

  const handleLoad = () => {
    try {
      const content = loadProjectWorkflow(projectId);
      if (!content) {
        setMessage("저장된 프로젝트 데이터가 없습니다.");
        return;
      }
      workflow.importFromJson(content);
      setMessage("이 프로젝트의 저장본을 불러왔습니다.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleImport = (text) => {
    try {
      workflow.importFromJson(text);
      saveProjectWorkflow(projectId, text, projectTitle);
      setMessage("JSON 파일에서 워크플로우를 가져왔습니다.");
    } catch (error) {
      setMessage(`가져오기 실패: ${error.message}`);
    }
  };

  useEffect(() => {
    const project = getProject(projectId);
    if (!project) {
      setMessage("프로젝트를 찾을 수 없어 홈으로 이동합니다.");
      navigate("/");
      return;
    }

    setProjectTitle(project.title || "Untitled Project");

    const content = loadProjectWorkflow(projectId);
    if (!content) return;

    try {
      workflow.importFromJson(content);
      setMessage("프로젝트를 열었습니다.");
    } catch (error) {
      setMessage(`프로젝트 로드 실패: ${error.message}`);
    }
  }, [navigate, projectId]);

  useEffect(() => {
    updateProjectTitle(projectId, projectTitle);
  }, [projectId, projectTitle]);

  return (
    <div className={`workflow-layout ${isMobile ? "is-mobile-layout" : ""}`}>
      <TopToolbar
        onHome={() => navigate("/")}
        onNew={workflow.resetWorkflow}
        onSave={handleSave}
        onLoad={handleLoad}
        onLoadTemplate={() => {
          workflow.loadTemplateWorkflow();
          setMessage("예시 템플릿 워크플로우를 불러왔습니다.");
        }}
        onExport={() => {
          const content = workflow.serializeCurrentWorkflow();
          const blob = new Blob([content], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${projectTitle || "hiddentube"}.json`;
          link.click();
          URL.revokeObjectURL(url);
          setMessage("JSON 파일로 내보냈습니다.");
        }}
        onImport={handleImport}
        onUndo={workflow.undo}
        onRedo={workflow.redo}
        canUndo={workflow.canUndo}
        canRedo={workflow.canRedo}
        message={message}
        projectTitle={projectTitle}
        onProjectTitleChange={setProjectTitle}
      />

      <main className="canvas-area">
        <CanvasNodeToolbar onAddNode={workflow.addNode} />
        <ReactFlow
          nodes={nodesWithActions}
          edges={workflow.edges}
          onNodesChange={workflow.onNodesChange}
          onEdgesChange={workflow.onEdgesChange}
          onConnect={workflow.onConnect}
          nodeTypes={nodeTypes}
          onSelectionChange={workflow.setSelection}
          deleteKeyCode={["Delete"]}
          fitView
        >
          <Background gap={20} size={1} />
          <MiniMap zoomable pannable />
          <Controls />
        </ReactFlow>
      </main>

      <ProjectExecutionPanel projectId={projectId} workflow={workflow} projectTitle={projectTitle} setMessage={setMessage} />
    </div>
  );
}

function WorkflowEditor({ projectId }) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorBody projectId={projectId} />
    </ReactFlowProvider>
  );
}

export default WorkflowEditor;
