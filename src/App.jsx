import React, { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import { nanoid } from "nanoid";

import NodePalette from "./components/NodePalette.jsx";
import Inspector from "./components/Inspector.jsx";
import InputNode from "./nodes/InputNode.jsx";
import GenerateNode from "./nodes/GenerateNode.jsx";
import OutputNode from "./nodes/OutputNode.jsx";

import { makeNodeData } from "./workflow/nodeDefinitions.js";
import { runWorkflow } from "./workflow/runner.js";

const STORAGE_KEY = "opal_mvp_workflow_v1";

function makeInitial() {
  // 기본 예시 플로우 1개를 깔아줌 (Input -> Generate -> Output)
  const n1 = {
    id: nanoid(),
    type: "inputNode",
    position: { x: 80, y: 120 },
    data: makeNodeData("input"),
  };
  const n2 = {
    id: nanoid(),
    type: "generateNode",
    position: { x: 420, y: 110 },
    data: makeNodeData("generate"),
  };
  const n3 = {
    id: nanoid(),
    type: "outputNode",
    position: { x: 820, y: 120 },
    data: makeNodeData("output"),
  };

  // input 기본키에 맞춰 generate가 템플릿 변수를 쓸 수 있게 target도 하나 더 추가
  // (input을 하나 더 만들지 않고, generate가 renderTemplate에서 빈값 처리하긴 함)
  n1.data.config.key = "topic";
  n1.data.config.value = "보험/경제 이슈 요약";
  n2.data.config.promptTemplate =
    "주제: {{topic}}\n\n위 주제로 20초 쇼츠 대본을 만들어줘.\n- 훅 1줄\n- 포인트 3개\n- 마지막 CTA 1줄";

  const e1 = { id: nanoid(), source: n1.id, target: n2.id };
  const e2 = { id: nanoid(), source: n2.id, target: n3.id };
  return { nodes: [n1, n2, n3], edges: [e1, e2] };
}

function stripRuntimeFields(node) {
  // 저장할 때 실행 상태/출력은 빼도 되고, 남겨도 됨.
  // MVP에선 남기되, status는 idle로 초기화해 저장.
  return {
    ...node,
    data: {
      ...node.data,
      status: "idle",
      lastError: "",
      // output/outputPreview는 저장해도 되지만, 깔끔하게 비움
      output: null,
      outputPreview: "",
    },
  };
}

function serializeWorkflow(nodes, edges) {
  return JSON.stringify(
    {
      version: 1,
      nodes: nodes.map(stripRuntimeFields),
      edges,
    },
    null,
    2
  );
}

function deserializeWorkflow(text) {
  const obj = JSON.parse(text);
  if (!obj || !Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
    throw new Error("잘못된 워크플로우 JSON 형식입니다.");
  }
  return { nodes: obj.nodes, edges: obj.edges };
}

function AppInner() {
  const rf = useReactFlow();
  const abortRef = useRef(null);

  const initial = useMemo(() => makeInitial(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  const nodeTypes = useMemo(
    () => ({
      inputNode: InputNode,
      generateNode: GenerateNode,
      outputNode: OutputNode,
    }),
    []
  );

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);

  const log = useCallback((line) => {
    setLogs((prev) => {
      const next = [...prev, line];
      // 너무 길어지면 잘라냄
      if (next.length > 200) return next.slice(next.length - 200);
      return next;
    });
  }, []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, id: nanoid() }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = rf.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const id = nanoid();

      let flowType = "generateNode";
      if (type === "input") flowType = "inputNode";
      if (type === "generate") flowType = "generateNode";
      if (type === "output") flowType = "outputNode";

      const newNode = {
        id,
        type: flowType,
        position,
        data: makeNodeData(type),
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(id);
    },
    [rf, setNodes]
  );

  const patchNodeData = useCallback((nodeId, patch) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        return { ...n, data: { ...n.data, ...patch } };
      })
    );
  }, [setNodes]);

  const resetRunState = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, status: "idle", lastError: "", output: null, outputPreview: "" },
      }))
    );
  }, [setNodes]);

  const handleRun = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setLogs([]);
    resetRunState();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await runWorkflow({
        nodes,
        edges,
        signal: controller.signal,
        onLog: log,
        onStepStatus: (nodeId, patch) => patchNodeData(nodeId, patch),
      });

      log(`✅ DONE. final=${result ? JSON.stringify(result).slice(0, 200) : "null"}`);
    } catch (e) {
      log(`❌ FAIL. ${e?.message || String(e)}`);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [running, nodes, edges, log, patchNodeData, resetRunState]);

  const handleStop = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setLogs([]);
  }, [setNodes, setEdges]);

  const handleSave = useCallback(() => {
    const json = serializeWorkflow(nodes, edges);
    localStorage.setItem(STORAGE_KEY, json);
    log("💾 Saved to localStorage");
  }, [nodes, edges, log]);

  const handleLoad = useCallback(() => {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) {
      log("ℹ️ No saved workflow in localStorage");
      return;
    }
    try {
      const { nodes: n, edges: e } = deserializeWorkflow(text);
      setNodes(n);
      setEdges(e);
      setSelectedNodeId(null);
      setLogs([]);
      log("📦 Loaded from localStorage");
    } catch (err) {
      log(`❌ Load error: ${err?.message || String(err)}`);
    }
  }, [setNodes, setEdges, log]);

  const handleExport = useCallback(async () => {
    const json = serializeWorkflow(nodes, edges);
    await navigator.clipboard.writeText(json);
    log("📋 Export JSON copied to clipboard");
  }, [nodes, edges, log]);

  const handleImport = useCallback(() => {
    const text = prompt("붙여넣을 워크플로우 JSON을 입력하세요:");
    if (!text) return;
    try {
      const { nodes: n, edges: e } = deserializeWorkflow(text);
      setNodes(n);
      setEdges(e);
      setSelectedNodeId(null);
      setLogs([]);
      log("📥 Imported workflow JSON");
    } catch (err) {
      log(`❌ Import error: ${err?.message || String(err)}`);
    }
  }, [setNodes, setEdges, log]);

  const handleFitView = useCallback(() => {
    rf.fitView({ padding: 0.2 });
  }, [rf]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">Opal-like MVP</div>
        <button className="btn primary" onClick={handleRun} disabled={running}>Run</button>
        <button className="btn" onClick={handleStop} disabled={!running}>Stop</button>

        <div className="sep" />

        <button className="btn" onClick={handleSave}>Save</button>
        <button className="btn" onClick={handleLoad}>Load</button>
        <button className="btn" onClick={handleExport}>Export JSON</button>
        <button className="btn" onClick={handleImport}>Import JSON</button>

        <div className="sep" />

        <button className="btn" onClick={handleFitView}>Fit View</button>
        <button className="btn danger" onClick={handleClear}>Clear</button>

        <div style={{ marginLeft: "auto" }} className="small">
          {running ? "RUNNING..." : "READY"}
        </div>
      </div>

      <div className="left">
        <NodePalette />
      </div>

      <div className="canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>

      <div className="right">
        <Inspector selectedNode={selectedNode} onPatchNodeData={patchNodeData} />
      </div>

      <div className="bottom">
        <div className="h1">실행 로그</div>
        <div className="card" style={{ maxHeight: 140, overflow: "auto" }}>
          {logs.length === 0 ? (
            <div className="small">Run을 누르면 로그가 표시됩니다.</div>
          ) : (
            logs.map((l, i) => <div className="logLine" key={i}>{l}</div>)
          )}
        </div>
        <div className="small" style={{ marginTop: 8 }}>
          * 현재 MVP는 LLM 호출/업로드를 “모의 실행”합니다. 다음 단계에서 실제 Gemini/YouTube 연동을 붙입니다.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // useReactFlow를 쓰려면 ReactFlowProvider를 감싸야 함
  // (ReactFlow 컴포넌트 내부에서 훅을 쓰는 구조라 Provider를 최상단에 둠)
  const ReactFlowProvider = require("reactflow").ReactFlowProvider;
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
