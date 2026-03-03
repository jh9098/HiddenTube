import React, { useCallback, useEffect, useState } from "react";
import { createProject, getProject, updateProject } from "../../api/projectApi";
import ProjectAssetsPanel from "./ProjectAssetsPanel";
import RenderJobPanel from "./RenderJobPanel";
import ApiConnectionTest from "./workspace/ApiConnectionTest";
import ManualRenderJsonInput from "./workspace/ManualRenderJsonInput";
import ProductionTabBar from "./workspace/ProductionTabBar";
import RenderJsonPreview from "./workspace/RenderJsonPreview";

export default function ProductionWorkspace({ nodes = [], edges = [], projectTitle = "" }) {
  const [activeTab, setActiveTab] = useState("assets");
  const [projectId, setProjectId] = useState(() => {
    try {
      return localStorage.getItem("hiddentube_project_id") || "";
    } catch {
      return "";
    }
  });
  const [projectNameInput, setProjectNameInput] = useState(projectTitle || "Untitled Project");
  const [projectInfo, setProjectInfo] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [manualRenderJson, setManualRenderJson] = useState(null);

  const apiBaseUrl = (() => {
    try {
      const raw = import.meta?.env?.VITE_API_BASE_URL;
      if (raw && raw.trim()) return raw.trim().replace(/\/$/, "");
      if (
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ) {
        return "http://localhost:8000";
      }
      return window.location.origin;
    } catch {
      return "unknown";
    }
  })();

  useEffect(() => {
    if (projectTitle && projectTitle.trim()) {
      setProjectNameInput(projectTitle);
    }
  }, [projectTitle]);

  const showMsg = (msg, error = false) => {
    setMessage(msg);
    setIsError(error);
    console.log("[ProductionWorkspace]", msg);
  };

  const getRenderJson = useCallback(() => {
    if (manualRenderJson) return manualRenderJson;

    const renderNode = nodes.find((n) => n.type === "RenderJsonNode");
    if (!renderNode) return {};

    const parsedOutput = renderNode.data?.parsedOutput;
    if (
      parsedOutput &&
      typeof parsedOutput === "object" &&
      Array.isArray(parsedOutput.scenes) &&
      parsedOutput.scenes.length > 0
    ) {
      return parsedOutput;
    }

    const output = renderNode.data?.output;
    if (output && typeof output === "object" && Array.isArray(output.scenes) && output.scenes.length > 0) {
      return output;
    }

    const manual = renderNode.data?.manualResult || "";
    if (manual.trim()) {
      try {
        const parsed = JSON.parse(manual);
        if (parsed && (parsed.scenes || parsed.meta)) return parsed;
      } catch {
        // noop
      }
    }

    return {};
  }, [nodes, manualRenderJson]);

  const loadProject = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await getProject(id);
      setProjectInfo(data);
      setProjectNameInput(data.title || "");
      showMsg(`프로젝트 불러옴: ${id}`);
    } catch (e) {
      setProjectId("");
      try {
        localStorage.removeItem("hiddentube_project_id");
      } catch {
        // noop
      }
      showMsg("저장된 작업 정보를 찾을 수 없습니다. 다시 작업 시작을 눌러주세요.", true);
    }
  }, []);

  useEffect(() => {
    if (projectId) loadProject(projectId);
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    showMsg("작업 시작 준비 중...");
    const renderJson = getRenderJson();

    try {
      const proj = await createProject({
        title: projectNameInput || "Untitled Project",
        render_json: renderJson,
      });
      setProjectId(proj.project_id);
      setProjectInfo(proj);
      try {
        localStorage.setItem("hiddentube_project_id", proj.project_id);
      } catch {
        // noop
      }
      showMsg(`✅ 작업 시작 준비 완료: ${proj.project_id}`);
    } catch (err) {
      console.error("[ProductionWorkspace] createProject error:", err);
      showMsg("❌ 작업 시작 준비 실패: " + err.message, true);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveRenderJson = async () => {
    if (!projectId) {
      showMsg("❌ 먼저 작업 시작을 눌러주세요.", true);
      return;
    }
    setSaving(true);
    showMsg("저장 중...");
    const renderJson = getRenderJson();

    try {
      await updateProject(projectId, { render_json: renderJson });
      showMsg("✅ render_json 저장 완료");
      await loadProject(projectId);
    } catch (err) {
      console.error("[ProductionWorkspace] saveRenderJson error:", err);
      showMsg("❌ 저장 실패: " + err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const renderJson = getRenderJson();
  const hasRenderJson = renderJson && Object.keys(renderJson).length > 0;

  const tabs = [
    { id: "assets", label: "📦 에셋 업로드" },
    { id: "render", label: "🎬 렌더링" },
  ];

  const saveButtonTitle = !projectId
    ? "먼저 작업 시작을 눌러주세요"
    : hasRenderJson
      ? "render_json을 서버에 저장합니다"
      : "render_json이 없어도 저장 가능합니다";

  return (
    <div className="production-workspace">
      <div className="production-header">
        <div className="production-title">Production 작업 공간</div>
        <div className="production-subtitle">현재 설정으로 자동화 작업을 시작합니다.</div>
        <div className="production-subtitle">작업 시작 후 실행 이력이 기록됩니다.</div>

        <ApiConnectionTest apiBaseUrl={apiBaseUrl} />

        <div className="production-project-row">
          <input
            value={projectNameInput}
            onChange={(e) => setProjectNameInput(e.target.value)}
            placeholder="프로젝트 제목을 입력하세요"
            className="production-input"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="production-btn production-btn-primary"
          >
            {creating ? "시작 준비 중..." : "작업 시작하기"}
          </button>
        </div>

        {projectId && <div className="production-project-id">현재 프로젝트: {projectId}</div>}

        <RenderJsonPreview renderJson={renderJson} />

        <ManualRenderJsonInput
          onApply={(json) => {
            setManualRenderJson(json);
            showMsg(`✅ 수동 render_json 적용됨 (${json.scenes?.length || 0}개 씬)`);
          }}
        />

        <button
          type="button"
          onClick={handleSaveRenderJson}
          disabled={saving || !projectId}
          className={`production-btn production-btn-secondary production-btn-block ${
            !projectId ? "is-disabled" : ""
          }`}
          title={saveButtonTitle}
        >
          {saving ? "저장 중..." : `↑ render_json 저장하기${!hasRenderJson ? " (현재 비어있음)" : ""}`}
        </button>

        {message && (
          <div className={`production-message ${isError ? "is-error" : "is-success"}`}>{message}</div>
        )}
      </div>

      <ProductionTabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div className="production-content">
        {activeTab === "assets" && <ProjectAssetsPanel projectId={projectId} onAssetsReady={() => {}} />}
        {activeTab === "render" && <RenderJobPanel projectId={projectId} />}
      </div>
    </div>
  );
}
