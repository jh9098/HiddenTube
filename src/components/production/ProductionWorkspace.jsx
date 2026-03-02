// Production 탭 - 프로젝트 생성/선택, 에셋 업로드, 렌더링 통합 화면
// 사용법: <ProductionWorkspace nodes={nodes} edges={edges} />

import React, { useCallback, useEffect, useState } from "react";
import { createProject, getProject, updateProject } from "../../api/projectApi";
import ProjectAssetsPanel from "./ProjectAssetsPanel";
import RenderJobPanel from "./RenderJobPanel";

// ── 탭 ──────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "10px 14px 0",
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            border: "none",
            borderBottom: active === tab.id ? "2px solid #6366f1" : "2px solid transparent",
            background: "none",
            color: active === tab.id ? "#6366f1" : "#6b7280",
            fontWeight: active === tab.id ? 700 : 400,
            padding: "7px 10px",
            fontSize: 13,
            cursor: "pointer",
            borderRadius: "6px 6px 0 0",
            transition: "all 0.15s",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── render_json 미리보기 ────────────────────
function RenderJsonPreview({ renderJson }) {
  const [open, setOpen] = useState(false);
  if (!renderJson || Object.keys(renderJson).length === 0) {
    return (
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          padding: "10px",
          background: "#f9fafb",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
        }}
      >
        render_json이 아직 없습니다. RenderJsonNode의 결과를 저장한 후 이 버튼을 클릭하세요.
      </div>
    );
  }

  const scenes = renderJson.scenes || [];
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          background: "#eef2ff",
          borderRadius: 8,
          border: "1px solid #c7d2fe",
          cursor: "pointer",
        }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ fontSize: 12, color: "#3730a3" }}>📋 render_json ({scenes.length}개 씬)</span>
        <span style={{ fontSize: 12, color: "#6366f1" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <pre
          style={{
            fontSize: 10,
            background: "#1e1b4b",
            color: "#a5b4fc",
            borderRadius: "0 0 8px 8px",
            padding: "10px",
            overflow: "auto",
            maxHeight: 200,
            margin: 0,
          }}
        >
          {JSON.stringify(renderJson, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────
export default function ProductionWorkspace({ nodes = [], edges = [] }) {
  const [activeTab, setActiveTab] = useState("assets");
  const [projectId, setProjectId] = useState(() => {
    try {
      return localStorage.getItem("hiddentube_project_id") || "";
    } catch {
      return "";
    }
  });
  const [projectTitle, setProjectTitle] = useState("새 프로젝트");
  const [projectInfo, setProjectInfo] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // render_json 추출: RenderJsonNode의 output에서
  const getRenderJson = useCallback(() => {
    const renderNode = nodes.find((n) => n.type === "RenderJsonNode");
    if (!renderNode) return {};
    const output = renderNode.data?.output || renderNode.data?.parsedOutput || {};
    // scenes 있으면 유효한 render_json으로 판단
    if (Array.isArray(output.scenes) && output.scenes.length > 0) return output;
    // manualResult에서도 시도
    const manual = renderNode.data?.manualResult || "";
    if (manual.trim()) {
      try {
        const parsed = JSON.parse(manual);
        if (parsed.scenes) return parsed;
      } catch {
        // noop
      }
    }
    return {};
  }, [nodes]);

  // 프로젝트 불러오기
  const loadProject = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await getProject(id);
      setProjectInfo(data);
      setProjectTitle(data.title || "");
    } catch {
      setProjectId("");
      localStorage.removeItem("hiddentube_project_id");
      setMessage("저장된 프로젝트를 찾을 수 없습니다. 새 프로젝트를 만드세요.");
    }
  }, []);

  useEffect(() => {
    if (projectId) loadProject(projectId);
  }, [projectId, loadProject]);

  // 프로젝트 생성
  const handleCreate = async () => {
    setCreating(true);
    setMessage("");
    const renderJson = getRenderJson();
    try {
      const proj = await createProject({ title: projectTitle || "새 프로젝트", render_json: renderJson });
      setProjectId(proj.project_id);
      setProjectInfo(proj);
      localStorage.setItem("hiddentube_project_id", proj.project_id);
      setMessage(`✅ 프로젝트 생성 완료: ${proj.project_id}`);
    } catch (err) {
      setMessage("프로젝트 생성 실패: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  // render_json 저장 (기존 프로젝트 업데이트)
  const handleSaveRenderJson = async () => {
    if (!projectId) {
      setMessage("먼저 프로젝트를 생성하세요.");
      return;
    }
    setSaving(true);
    setMessage("");
    const renderJson = getRenderJson();
    try {
      await updateProject(projectId, { render_json: renderJson });
      setMessage("✅ render_json 저장 완료");
      await loadProject(projectId);
    } catch (err) {
      setMessage("저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderJson = getRenderJson();
  const hasRenderJson = Array.isArray(renderJson.scenes) && renderJson.scenes.length > 0;

  const TABS = [
    { id: "assets", label: "📦 에셋 업로드" },
    { id: "render", label: "🎬 렌더링" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* ── 프로젝트 헤더 ── */}
      <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Production 작업 공간</div>

        {/* 프로젝트명 입력 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            placeholder="프로젝트 이름"
            style={{
              flex: 1,
              border: "1px solid #d1d5db",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 13,
            }}
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              border: "none",
              borderRadius: 8,
              background: "#6366f1",
              color: "#fff",
              padding: "6px 12px",
              fontSize: 12,
              cursor: creating ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? "생성 중..." : projectId ? "새 프로젝트" : "프로젝트 생성"}
          </button>
        </div>

        {/* render_json 미리보기 + 저장 */}
        {hasRenderJson && (
          <div style={{ marginBottom: 6 }}>
            <RenderJsonPreview renderJson={renderJson} />
            <button
              onClick={handleSaveRenderJson}
              disabled={saving || !projectId}
              style={{
                width: "100%",
                border: "1px solid #6366f1",
                borderRadius: 8,
                background: "#fff",
                color: "#6366f1",
                padding: "6px 0",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {saving ? "저장 중..." : "↑ render_json 서버에 저장"}
            </button>
          </div>
        )}

        {/* 메시지 */}
        {message && (
          <div
            style={{
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 7,
              background: message.includes("✅") ? "#f0fdf4" : "#fef2f2",
              color: message.includes("✅") ? "#166534" : "#991b1b",
              border: `1px solid ${message.includes("✅") ? "#86efac" : "#fca5a5"}`,
            }}
          >
            {message}
          </div>
        )}
      </div>

      {/* ── 탭 ── */}
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {/* ── 탭 내용 ── */}
      <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
        {activeTab === "assets" && <ProjectAssetsPanel projectId={projectId} onAssetsReady={() => {}} />}
        {activeTab === "render" && <RenderJobPanel projectId={projectId} />}
      </div>
    </div>
  );
}
