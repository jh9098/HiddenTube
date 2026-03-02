import { useCallback, useEffect, useMemo, useState } from "react";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "reactflow";

import {
  createWorkflowNode,
  deserializeWorkflow,
  NODE_STATUSES,
  serializeWorkflow,
  WORKFLOW_HISTORY_STORAGE_KEY,
  WORKFLOW_STORAGE_KEY,
} from "../utils/workflowData";
import { createYoutubeTemplate } from "../templates/youtubeTemplate";
import { buildPromptPackage, executeNodes } from "../workflow/youtubeExecution";
import {
  createHistoryState,
  pushHistorySnapshot,
  redoHistory,
  replacePresent,
  undoHistory,
} from "./workflowHistory";

const AUTO_SAVE_DELAY_MS = 500;

function normalizePresent(present) {
  const safePresent = present && typeof present === "object" ? present : {};
  const safeNodes = Array.isArray(safePresent.nodes) ? safePresent.nodes : [];
  const safeEdges = Array.isArray(safePresent.edges) ? safePresent.edges : [];

  return {
    nodes: safeNodes,
    edges: safeEdges,
  };
}

function sanitizeSelectionIds(ids) {
  return [...new Set((ids || []).filter(Boolean))];
}

function getInitialPresent() {
  try {
    const historyText = localStorage.getItem(WORKFLOW_HISTORY_STORAGE_KEY);
    if (historyText) {
      const parsedHistory = JSON.parse(historyText);
      if (Array.isArray(parsedHistory?.present?.nodes) && Array.isArray(parsedHistory?.present?.edges)) {
        return parsedHistory.present;
      }
    }

    const workflowText = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (workflowText) {
      return deserializeWorkflow(workflowText);
    }
  } catch {
    // 파싱 실패 시 템플릿으로 fallback
  }

  return createYoutubeTemplate();
}

export function useWorkflowState() {
  const [history, setHistory] = useState(() => createHistoryState(getInitialPresent()));
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState([]);

  const present = normalizePresent(history?.present);
  const nodes = present.nodes;
  const edges = present.edges;

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const selectSingleNode = useCallback((nodeId) => {
    setSelectedNodeId(nodeId ?? null);
    setSelectedNodeIds(nodeId ? [nodeId] : []);
    if (nodeId) {
      setSelectedEdgeIds([]);
    }
  }, []);

  const commitPresent = useCallback((nextPresent, options = {}) => {
    const { recordHistory = true } = options;
    const normalizedNextPresent = normalizePresent(nextPresent);

    setHistory((currentHistory) => {
      if (currentHistory.present === normalizedNextPresent) {
        return currentHistory;
      }

      if (recordHistory) {
        return pushHistorySnapshot(currentHistory, normalizedNextPresent);
      }

      return replacePresent(currentHistory, normalizedNextPresent);
    });
  }, []);

  const setNodes = useCallback(
    (updater, options = {}) => {
      const { recordHistory = true } = options;
      const nextNodes = typeof updater === "function" ? updater(nodes) : updater;
      commitPresent({ nodes: nextNodes, edges }, { recordHistory });
    },
    [commitPresent, edges, nodes]
  );

  const setEdges = useCallback(
    (updater, options = {}) => {
      const { recordHistory = true } = options;
      const nextEdges = typeof updater === "function" ? updater(edges) : updater;
      commitPresent({ nodes, edges: nextEdges }, { recordHistory });
    },
    [commitPresent, edges, nodes]
  );

  const syncSelectionAfterDelete = useCallback((nextNodes, nextEdges) => {
    const nextNodeIds = new Set(nextNodes.map((node) => node.id));
    const nextEdgeIds = new Set(nextEdges.map((edge) => edge.id));

    setSelectedNodeIds((current) => current.filter((id) => nextNodeIds.has(id)));
    setSelectedEdgeIds((current) => current.filter((id) => nextEdgeIds.has(id)));
    setSelectedNodeId((currentId) => (currentId && nextNodeIds.has(currentId) ? currentId : null));
  }, []);

  const onNodesChange = useCallback(
    (changes) => {
      const hasStructuralChange = changes.some((change) => change.type !== "select");
      const nextNodes = applyNodeChanges(changes, nodes);
      setNodes(nextNodes, { recordHistory: hasStructuralChange });
    },
    [nodes, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      const hasStructuralChange = changes.some((change) => change.type !== "select");
      const nextEdges = applyEdgeChanges(changes, edges);
      setEdges(nextEdges, { recordHistory: hasStructuralChange });
    },
    [edges, setEdges]
  );

  const setSelection = useCallback(({ nodes: selectedNodes = [], edges: selectedEdges = [] }) => {
    const nodeIds = sanitizeSelectionIds(selectedNodes.map((node) => node.id));
    const edgeIds = sanitizeSelectionIds(selectedEdges.map((edge) => edge.id));

    setSelectedNodeIds(nodeIds);
    setSelectedEdgeIds(edgeIds);
    setSelectedNodeId(nodeIds[0] ?? null);
  }, []);

  const deleteNodesByIds = useCallback(
    (nodeIds) => {
      const safeNodeIds = sanitizeSelectionIds(nodeIds);
      if (!safeNodeIds.length) return;

      const idSet = new Set(safeNodeIds);
      const nextNodes = nodes.filter((node) => !idSet.has(node.id));
      const nextEdges = edges.filter((edge) => !idSet.has(edge.source) && !idSet.has(edge.target));

      commitPresent({ nodes: nextNodes, edges: nextEdges });
      syncSelectionAfterDelete(nextNodes, nextEdges);
    },
    [commitPresent, edges, nodes, syncSelectionAfterDelete]
  );

  const deleteEdgesByIds = useCallback(
    (edgeIds) => {
      const safeEdgeIds = sanitizeSelectionIds(edgeIds);
      if (!safeEdgeIds.length) return;

      const idSet = new Set(safeEdgeIds);
      const nextEdges = edges.filter((edge) => !idSet.has(edge.id));

      commitPresent({ nodes, edges: nextEdges });
      syncSelectionAfterDelete(nodes, nextEdges);
    },
    [commitPresent, edges, nodes, syncSelectionAfterDelete]
  );

  const deleteSelectedElements = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      deleteNodesByIds(selectedNodeIds);
      return;
    }

    if (selectedEdgeIds.length > 0) {
      deleteEdgesByIds(selectedEdgeIds);
    }
  }, [deleteEdgesByIds, deleteNodesByIds, selectedEdgeIds, selectedNodeIds]);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    deleteNodesByIds([selectedNodeId]);
  }, [deleteNodesByIds, selectedNodeId]);

  const detachIncomingEdges = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      const nextEdges = edges.filter((edge) => edge.target !== nodeId);
      if (nextEdges.length === edges.length) return;
      commitPresent({ nodes, edges: nextEdges });
      syncSelectionAfterDelete(nodes, nextEdges);
    },
    [commitPresent, edges, nodes, syncSelectionAfterDelete]
  );


  const removeIncomingEdge = useCallback(
    (targetNodeId, sourceNodeId) => {
      if (!targetNodeId || !sourceNodeId) return;
      const nextEdges = edges.filter((edge) => !(edge.target === targetNodeId && edge.source === sourceNodeId));
      if (nextEdges.length === edges.length) return;
      commitPresent({ nodes, edges: nextEdges });
      syncSelectionAfterDelete(nodes, nextEdges);
    },
    [commitPresent, edges, nodes, syncSelectionAfterDelete]
  );
  const onConnect = useCallback(
    (connection) => {
      if (!connection?.source || !connection?.target || connection.source === connection.target) {
        return;
      }
      setEdges((currentEdges) => addEdge({ ...connection, id: `edge_${Date.now()}` }, currentEdges));
    },
    [setEdges]
  );

  const addNode = useCallback(
    (nodeType) => {
      const nextNode = createWorkflowNode(nodeType, {
        x: 200 + Math.random() * 180,
        y: 120 + Math.random() * 200,
      });
      setNodes((currentNodes) => [...currentNodes, nextNode]);
      selectSingleNode(nextNode.id);
    },
    [selectSingleNode, setNodes]
  );

  const updateNodeData = useCallback(
    (nodeId, updater) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== nodeId) return node;
          return {
            ...node,
            data: typeof updater === "function" ? updater(node.data) : { ...node.data, ...updater },
          };
        })
      );
    },
    [setNodes]
  );

  const updateSelectedNodeMeta = useCallback(
    (field, value) => {
      if (!selectedNodeId) return;
      updateNodeData(selectedNodeId, (currentData) => ({ ...currentData, [field]: value }));
    },
    [selectedNodeId, updateNodeData]
  );

  const updateNodeMeta = useCallback(
    (nodeId, field, value) => {
      if (!nodeId) return;
      updateNodeData(nodeId, (currentData) => ({ ...currentData, [field]: value }));
    },
    [updateNodeData]
  );

  const updateSelectedNodeConfigText = useCallback(
    (nextText) => {
      if (!selectedNodeId) return;
      try {
        const parsed = JSON.parse(nextText || "{}");
        updateNodeData(selectedNodeId, (currentData) => ({ ...currentData, config: parsed }));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: error.message };
      }
    },
    [selectedNodeId, updateNodeData]
  );

  const updateNodeConfig = useCallback(
    (nodeId, configUpdater) => {
      if (!nodeId) return;
      updateNodeData(nodeId, (currentData) => {
        const currentConfig = currentData.config || {};
        const nextConfig =
          typeof configUpdater === "function"
            ? configUpdater(currentConfig)
            : { ...currentConfig, ...configUpdater };

        return {
          ...currentData,
          config: nextConfig,
        };
      });
    },
    [updateNodeData]
  );

  const updateNodeManualResult = useCallback(
    (nodeId, manualResult) => {
      if (!nodeId) return;
      updateNodeData(nodeId, (currentData) => ({ ...currentData, manualResult }));
    },
    [updateNodeData]
  );

  const executeFromNode = useCallback(
    (nodeId, manualOverrides) => {
      if (!nodeId) return;
      const baseNodes = manualOverrides && typeof manualOverrides === "object"
        ? nodes.map((node) => {
            const override = manualOverrides[node.id];
            return override !== undefined
              ? { ...node, data: { ...node.data, manualResult: override } }
              : node;
          })
        : nodes;
      const nextNodes = executeNodes(baseNodes, edges, { startNodeId: nodeId, runMode: "downstream" });
      commitPresent({ nodes: nextNodes, edges });
    },
    [commitPresent, edges, nodes]
  );

  const updateSelectedNodeManualResult = useCallback(
    (manualResult) => {
      if (!selectedNodeId) return;
      updateNodeData(selectedNodeId, (currentData) => ({ ...currentData, manualResult }));
    },
    [selectedNodeId, updateNodeData]
  );

  const updateSelectedNodeStatus = useCallback(
    (nextStatus) => {
      if (!selectedNodeId || !NODE_STATUSES.includes(nextStatus)) return;
      updateNodeData(selectedNodeId, (currentData) => ({ ...currentData, status: nextStatus }));
    },
    [selectedNodeId, updateNodeData]
  );

  const executeSelectedNodeOnly = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((currentNodes) => executeNodes(currentNodes, edges, { startNodeId: selectedNodeId, runMode: "single" }));
  }, [edges, selectedNodeId, setNodes]);

  const executeFromSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((currentNodes) => executeNodes(currentNodes, edges, { startNodeId: selectedNodeId, runMode: "downstream" }));
  }, [edges, selectedNodeId, setNodes]);

  const executeAllNodes = useCallback(() => {
    setNodes((currentNodes) => executeNodes(currentNodes, edges));
  }, [edges, setNodes]);

  const copyPromptPackage = useCallback(async () => {
    const content = buildPromptPackage(nodes);
    await navigator.clipboard.writeText(content);
    return content;
  }, [nodes]);

  const resetWorkflow = useCallback(() => {
    commitPresent({ nodes: [], edges: [] });
    selectSingleNode(null);
    setSelectedEdgeIds([]);
  }, [commitPresent, selectSingleNode]);

  const loadTemplateWorkflow = useCallback(() => {
    const template = createYoutubeTemplate();
    commitPresent({ nodes: template.nodes, edges: template.edges });
    selectSingleNode(null);
    setSelectedEdgeIds([]);
  }, [commitPresent, selectSingleNode]);

  const saveToLocalStorage = useCallback(() => {
    const serialized = serializeWorkflow({ nodes, edges });
    localStorage.setItem(WORKFLOW_STORAGE_KEY, serialized);
    localStorage.setItem(WORKFLOW_HISTORY_STORAGE_KEY, JSON.stringify(history));
    return serialized;
  }, [edges, history, nodes]);

  const loadFromLocalStorage = useCallback(() => {
    const savedText = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!savedText) {
      throw new Error("저장된 워크플로우가 없습니다.");
    }
    const loaded = deserializeWorkflow(savedText);
    commitPresent({ nodes: loaded.nodes, edges: loaded.edges });
    selectSingleNode(null);
    setSelectedEdgeIds([]);
  }, [commitPresent, selectSingleNode]);

  const importFromJson = useCallback(
    (rawText) => {
      const loaded = deserializeWorkflow(rawText);
      commitPresent({ nodes: loaded.nodes, edges: loaded.edges });
      selectSingleNode(null);
      setSelectedEdgeIds([]);
    },
    [commitPresent, selectSingleNode]
  );

  const loadWorkflowObject = useCallback(
    (workflowObj) => {
      if (!Array.isArray(workflowObj?.nodes) || !Array.isArray(workflowObj?.edges)) {
        throw new Error("워크플로우 객체 형식이 올바르지 않습니다.");
      }
      commitPresent({ nodes: workflowObj.nodes, edges: workflowObj.edges });
      selectSingleNode(null);
      setSelectedEdgeIds([]);
    },
    [commitPresent, selectSingleNode]
  );

  const undo = useCallback(() => {
    setHistory((currentHistory) => undoHistory(currentHistory));
    selectSingleNode(null);
    setSelectedEdgeIds([]);
  }, [selectSingleNode]);

  const redo = useCallback(() => {
    setHistory((currentHistory) => redoHistory(currentHistory));
    selectSingleNode(null);
    setSelectedEdgeIds([]);
  }, [selectSingleNode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const serialized = serializeWorkflow({ nodes, edges });
      localStorage.setItem(WORKFLOW_STORAGE_KEY, serialized);
      localStorage.setItem(WORKFLOW_HISTORY_STORAGE_KEY, JSON.stringify(history));
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [edges, history, nodes]);

  return {
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    selectedNodeIds,
    selectedEdgeIds,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId: selectSingleNode,
    setSelection,
    addNode,
    deleteSelectedNode,
    deleteSelectedElements,
    deleteNodesByIds,
    detachIncomingEdges,
    removeIncomingEdge,
    updateSelectedNodeMeta,
    updateNodeMeta,
    updateSelectedNodeConfigText,
    updateSelectedNodeManualResult,
    updateNodeConfig,
    updateNodeManualResult,
    updateSelectedNodeStatus,
    executeSelectedNodeOnly,
    executeFromSelectedNode,
    executeAllNodes,
    executeFromNode,
    copyPromptPackage,
    resetWorkflow,
    loadTemplateWorkflow,
    saveToLocalStorage,
    loadFromLocalStorage,
    importFromJson,
    loadWorkflowObject,
    undo,
    redo,
    serializeCurrentWorkflow: () => serializeWorkflow({ nodes, edges }),
  };
}
