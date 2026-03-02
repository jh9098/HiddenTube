// src/components/production/ProductionWorkspace.jsx
// 수정: render_json 버튼이 항상 보이게, 에러 로그 표시, CORS 디버깅 추가

import React, { useCallback, useEffect, useState } from "react";
import { createProject, getProject, updateProject } from "../../api/projectApi";
import ProjectAssetsPanel from "./ProjectAssetsPanel";
import RenderJobPanel from "./RenderJobPanel";

// ── 탭 ──────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "10px 14px 0", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
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
  const isEmpty = !renderJson || Object.keys(renderJson).length === 0;

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          background: isEmpty ? "#fafafa" : "#eef2ff",
          borderRadius: 8,
          border: `1px solid ${isEmpty ? "#e5e7eb" : "#c7d2fe"}`,
          cursor: isEmpty ? "default" : "pointer",
        }}
        onClick={() => !isEmpty && setOpen(!open)}
      >
        <span style={{ fontSize: 12, color: isEmpty ? "#9ca3af" : "#3730a3" }}>
          {isEmpty
            ? "📋 render_json 없음 (워크플로우 노드에서 생성하거나 수동으로 입력하세요)"
            : `📋 render_json (${(renderJson.scenes || []).length}개 씬)`}
        </span>
        {!isEmpty && <span style={{ fontSize: 12, color: "#6366f1" }}>{open ? "▲" : "▼"}</span>}
      </div>
      {!isEmpty && open && (
        <pre style={{ fontSize: 10, background: "#1e1b4b", color: "#a5b4fc", borderRadius: "0 0 8px 8px", padding: "10px", overflow: "auto", maxHeight: 200, margin: 0 }}>
          {JSON.stringify(renderJson, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── 수동 render_json 입력 ────────────────────
function ManualRenderJsonInput({ onApply }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  const handleApply = () => {
    try {
      const parsed = JSON.parse(text);
      setErr("");
      onApply(parsed);
      setOpen(false);
    } catch (e) {
      setErr("JSON 파싱 실패: " + e.message);
    }
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: "none", border: "1px dashed #d1d5db", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: "#6b7280", width: "100%" }}
      >
        {open ? "▲ 수동 render_json 입력 닫기" : "▼ 수동 render_json 직접 붙여넣기"}
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{"scenes": [...]} 형식으로 붙여넣으세요'
            style={{ width: "100%", minHeight: 120, border: "1px solid #d1d5db", borderRadius: 8, padding: 8, fontSize: 11, fontFamily: "monospace", boxSizing: "border-box" }}
          />
          {err && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 4 }}>{err}</div>}
          <button
            onClick={handleApply}
            style={{ marginTop: 6, width: "100%", border: "none", borderRadius: 8, background: "#6366f1", color: "#fff", padding: "7px 0", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
          >
            이 JSON으로 적용
          </button>
        </div>
      )}
    </div>
  );
}

// ── API 연결 테스트 ──────────────────────────
function ApiConnectionTest({ apiBaseUrl }) {
  const [status, setStatus] = useState("idle"); // idle | testing | ok | fail
  const [detail, setDetail] = useState("");

  const test = async () => {
    setStatus("testing");
    setDetail("");
    try {
      const res = await fetch(`${apiBaseUrl}/health`, { method: "GET" });
      if (res.ok) {
        setStatus("ok");
        setDetail(`${apiBaseUrl}/health → ${res.status} OK`);
      } else {
        setStatus("fail");
        setDetail(`${apiBaseUrl}/health → ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      setStatus("fail");
      setDetail(`연결 실패: ${e.message}`);
    }
  };

  return (
    <div style={{ marginBottom: 8, padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>API 연결 테스트</span>
        <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>{apiBaseUrl}</span>
        <button
          onClick={test}
          disabled={status === "testing"}
          style={{ marginLeft: "auto", border: "none", borderRadius: 6, background: "#374151", color: "#fff", padding: "3px 10px", fontSize: 11, cursor: "pointer", opacity: status === "testing" ? 0.6 : 1 }}
        >
          {status === "testing" ? "테스트 중..." : "테스트"}
        </button>
      </div>
      {detail && (
        <div style={{ fontSize: 11, color: status === "ok" ? "#166534" : "#dc2626", fontFamily: "monospace" }}>
          {status === "ok" ? "✅ " : "❌ "}{detail}
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────
export default function ProductionWorkspace({ nodes = [], edges = [] }) {
  const [activeTab, setActiveTab] = useState("assets");
  const [projectId, setProjectId] = useState(() => {
    try { return localStorage.getItem("hiddentube_project_id") || ""; } catch { return ""; }
  });
  const [projectTitle, setProjectTitle] = useState("새 프로젝트");
  const [projectInfo, setProjectInfo] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  // 수동 입력된 render_json override
  const [manualRenderJson, setManualRenderJson] = useState(null);

  // API base URL 표시용
  const apiBaseUrl = (() => {
    try {
      const raw = import.meta?.env?.VITE_API_BASE_URL;
      if (raw && raw.trim()) return raw.trim().replace(/\/$/, "");
      if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        return "http://localhost:8000";
      }
      // 프로덕션: Netlify 프록시 사용 (같은 도메인)
      return window.location.origin;
    } catch { return "unknown"; }
  })();

  const showMsg = (msg, error = false) => {
    setMessage(msg);
    setIsError(error);
    console.log("[ProductionWorkspace]", msg);
  };

  // render_json 추출: 노드에서 → 수동 입력 우선
  const getRenderJson = useCallback(() => {
    if (manualRenderJson) return manualRenderJson;

    // RenderJsonNode에서 추출 시도
    const renderNode = nodes.find((n) => n.type === "RenderJsonNode");
    if (!renderNode) return {};

    // parsedOutput 시도
    const parsedOutput = renderNode.data?.parsedOutput;
    if (parsedOutput && typeof parsedOutput === "object" && Array.isArray(parsedOutput.scenes) && parsedOutput.scenes.length > 0) {
      return parsedOutput;
    }

    // output 시도
    const output = renderNode.data?.output;
    if (output && typeof output === "object" && Array.isArray(output.scenes) && output.scenes.length > 0) {
      return output;
    }

    // manualResult에서 JSON 파싱 시도
    const manual = renderNode.data?.manualResult || "";
    if (manual.trim()) {
      try {
        const parsed = JSON.parse(manual);
        if (parsed && (parsed.scenes || parsed.meta)) return parsed;
      } catch { /* noop */ }
    }

    return {};
  }, [nodes, manualRenderJson]);

  // 프로젝트 불러오기
  const loadProject = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await getProject(id);
      setProjectInfo(data);
      setProjectTitle(data.title || "");
      showMsg(`프로젝트 불러옴: ${id}`);
    } catch (e) {
      setProjectId("");
      try { localStorage.removeItem("hiddentube_project_id"); } catch {}
      showMsg("저장된 프로젝트를 찾을 수 없습니다. 새 프로젝트를 만드세요.", true);
    }
  }, []);

  useEffect(() => {
    if (projectId) loadProject(projectId);
  }, []); // 마운트 시 1회만

  // 프로젝트 생성
  const handleCreate = async () => {
    setCreating(true);
    showMsg("프로젝트 생성 중...");
    const renderJson = getRenderJson();
    console.log("[ProductionWorkspace] createProject payload:", { title: projectTitle, render_json: renderJson });
    try {
      const proj = await createProject({ title: projectTitle || "새 프로젝트", render_json: renderJson });
      setProjectId(proj.project_id);
      setProjectInfo(proj);
      try { localStorage.setItem("hiddentube_project_id", proj.project_id); } catch {}
      showMsg(`✅ 프로젝트 생성 완료: ${proj.project_id}`);
    } catch (err) {
      console.error("[ProductionWorkspace] createProject error:", err);
      showMsg("❌ 프로젝트 생성 실패: " + err.message, true);
    } finally {
      setCreating(false);
    }
  };

  // render_json 저장
  const handleSaveRenderJson = async () => {
    if (!projectId) {
      showMsg("❌ 먼저 프로젝트를 생성하세요.", true);
      return;
    }
    setSaving(true);
    showMsg("저장 중...");
    const renderJson = getRenderJson();
    console.log("[ProductionWorkspace] saveRenderJson payload:", renderJson);
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

  const TABS = [
    { id: "assets", label: "📦 에셋 업로드" },
    { id: "render", label: "🎬 렌더링" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* ── 프로젝트 헤더 ── */}
      <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Production 작업 공간</div>

        {/* API 연결 테스트 */}
        <ApiConnectionTest apiBaseUrl={apiBaseUrl} />

        {/* 프로젝트명 + 생성 버튼 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            placeholder="프로젝트 이름"
            style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              border: "none", borderRadius: 8, background: "#6366f1", color: "#fff",
              padding: "6px 12px", fontSize: 12, cursor: creating ? "not-allowed" : "pointer",
              whiteSpace: "nowrap", opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? "생성 중..." : projectId ? "새 프로젝트" : "프로젝트 생성"}
          </button>
        </div>

        {/* 현재 project_id 표시 */}
        {projectId && (
          <div style={{ fontSize: 11, color: "#3730a3", fontFamily: "monospace", background: "#eef2ff", padding: "4px 8px", borderRadius: 6, marginBottom: 8 }}>
            현재 프로젝트: {projectId}
          </div>
        )}

        {/* render_json 미리보기 */}
        <RenderJsonPreview renderJson={renderJson} />

        {/* 수동 render_json 붙여넣기 */}
        <ManualRenderJsonInput onApply={(json) => { setManualRenderJson(json); showMsg("✅ 수동 render_json 적용됨 (" + (json.scenes?.length || 0) + "개 씬)"); }} />

        {/* render_json 저장 버튼 - 항상 표시 */}
        <button
          onClick={handleSaveRenderJson}
          disabled={saving || !projectId}
          style={{
            width: "100%", border: `1px solid ${projectId ? "#6366f1" : "#d1d5db"}`,
            borderRadius: 8, background: "#fff", color: projectId ? "#6366f1" : "#9ca3af",
            padding: "7px 0", fontSize: 12, cursor: !projectId ? "not-allowed" : "pointer",
            fontWeight: 600, marginBottom: 6,
          }}
          title={!projectId ? "프로젝트를 먼저 생성하세요" : hasRenderJson ? "render_json을 서버에 저장합니다" : "render_json이 없어도 저장 가능합니다"}
        >
          {saving ? "저장 중..." : `↑ render_json 서버에 저장${!hasRenderJson ? " (현재 비어있음)" : ""}`}
        </button>

        {/* 메시지 */}
        {message && (
          <div style={{
            fontSize: 12, padding: "6px 8px", borderRadius: 7,
            background: isError ? "#fef2f2" : "#f0fdf4",
            color: isError ? "#991b1b" : "#166534",
            border: `1px solid ${isError ? "#fca5a5" : "#86efac"}`,
            whiteSpace: "pre-wrap",
          }}>
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
