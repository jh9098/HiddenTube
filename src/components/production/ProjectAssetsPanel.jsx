// Production 작업공간 - 파일 업로드 및 에셋 매핑 패널
// 사용법: <ProjectAssetsPanel projectId={projectId} renderJson={renderJson} onAssetsReady={fn} />

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getAssets, remapAsset, uploadAsset, validateRender } from "../../api/projectApi";

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────

function statusColor(status) {
  if (status === "done") return "#166534";
  if (status === "warn") return "#92400e";
  if (status === "error") return "#991b1b";
  return "#374151";
}

function Section({ title, hint, defaultOpen = false, children }) {
  return (
    <details open={defaultOpen} className="production-accordion">
      <summary className="production-accordion-summary">
        <span>{title}</span>
        {hint ? <small>{hint}</small> : null}
      </summary>
      <div className="production-accordion-body">{children}</div>
    </details>
  );
}

// ─────────────────────────────────────────────
// 드래그앤드롭 + 클릭 업로드 존
// ─────────────────────────────────────────────
function DropZone({ accept, label, icon, onFiles, disabled, uploading }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) onFiles(files);
    },
    [disabled, onFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? "#6366f1" : "#d1d5db"}`,
        borderRadius: 10,
        padding: "14px 10px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        background: dragging ? "#eef2ff" : "#f9fafb",
        transition: "all 0.15s",
        opacity: disabled ? 0.5 : 1,
        marginBottom: 6,
      }}
    >
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{uploading ? "업로드 중..." : label}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// 씬별 매핑 행
// ─────────────────────────────────────────────
function MappingRow({ sceneId, assetType, currentFile, availableFiles, projectId, onMapped }) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (filename) => {
    if (!filename) return;
    setSaving(true);
    try {
      await remapAsset(projectId, { kind: assetType, scene_id: sceneId, filename });
      onMapped();
    } catch (err) {
      alert("매핑 저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isMissing = !currentFile;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "90px 1fr",
        gap: 6,
        alignItems: "center",
        padding: "6px 8px",
        borderRadius: 8,
        border: `1px solid ${isMissing ? "#fca5a5" : "#e5e7eb"}`,
        background: isMissing ? "#fff1f2" : "#fff",
        marginBottom: 4,
      }}
    >
      <div style={{ fontSize: 11, color: "#6b7280", wordBreak: "break-all" }}>{sceneId}</div>
      <select
        disabled={saving}
        value={currentFile || ""}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          border: `1px solid ${isMissing ? "#ef4444" : "#d1d5db"}`,
          borderRadius: 6,
          padding: "4px 6px",
          fontSize: 12,
          background: isMissing ? "#fef2f2" : "#fff",
          cursor: "pointer",
        }}
      >
        <option value="">-- 파일 선택 --</option>
        {availableFiles.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────
// 검증 결과 패널
// ─────────────────────────────────────────────
function ValidationPanel({ projectId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await validateRender(projectId);
      setResult(res);
    } catch (err) {
      setResult({
        valid: false,
        issues: [{ level: "error", code: "fetch_error", message: err.message }],
        missing_assets: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 12,
        background: "#f8fafc",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>렌더 검증</span>
        <button
          onClick={run}
          disabled={loading}
          style={{
            border: "none",
            borderRadius: 7,
            background: "#6366f1",
            color: "#fff",
            padding: "5px 12px",
            fontSize: 12,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "검증 중..." : "검증 실행"}
        </button>
      </div>

      {result && (
        <div>
          <div
            style={{
              fontWeight: 700,
              color: result.valid ? "#166534" : "#991b1b",
              marginBottom: 6,
              fontSize: 13,
            }}
          >
            {result.valid ? "✅ 검증 통과" : "❌ 검증 실패"}
          </div>
          {result.issues.map((issue, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                color: statusColor(issue.level === "error" ? "error" : "warn"),
                marginBottom: 2,
              }}
            >
              {issue.level === "error" ? "🔴" : "🟡"} [{issue.scene_id || "전체"}] {issue.message}
            </div>
          ))}
          {result.missing_assets.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b" }}>누락 에셋:</div>
              {result.missing_assets.map((a, i) => (
                <div key={i} style={{ fontSize: 11, color: "#991b1b" }}>
                  • {a.scene_id} / {a.asset_type}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function ProjectAssetsPanel({ projectId, onAssetsReady }) {
  const [assets, setAssets] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [message, setMessage] = useState("");

  // 에셋 목록 불러오기
  const fetchAssets = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await getAssets(projectId);
      setAssets(data);
      if (onAssetsReady) onAssetsReady(data);
    } catch (err) {
      setMessage("에셋 로드 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, onAssetsReady]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // 파일 업로드 핸들러
  const handleUpload = useCallback(
    async (files, type) => {
      if (!projectId) {
        setMessage("먼저 프로젝트를 생성하거나 선택해주세요.");
        return;
      }
      setUploadingType(type);
      setMessage("");
      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          const res = await uploadAsset(projectId, type, file);
          results.push(res);
        } catch (err) {
          errors.push(`${file.name}: ${err.message}`);
        }
      }

      if (errors.length) {
        setMessage("일부 업로드 실패:\n" + errors.join("\n"));
      } else {
        setMessage(`✅ ${results.length}개 업로드 완료`);
      }
      setUploadingType(null);
      await fetchAssets();
    },
    [projectId, fetchAssets]
  );

  if (!projectId) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: "center",
          color: "#6b7280",
          fontSize: 13,
          border: "2px dashed #d1d5db",
          borderRadius: 10,
          background: "#f9fafb",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
        <div>프로젝트를 먼저 생성하거나 선택해주세요.</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>render_json이 저장된 후 에셋을 업로드할 수 있습니다.</div>
      </div>
    );
  }

  const sceneIds = assets?.scene_ids || [];
  const assetMap = assets?.asset_map || {};
  const fileList = assets?.assets || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 프로젝트 ID 표시 */}
      <div
        style={{
          background: "#eef2ff",
          border: "1px solid #c7d2fe",
          borderRadius: 8,
          padding: "6px 10px",
          fontSize: 11,
          color: "#3730a3",
          fontFamily: "monospace",
          wordBreak: "break-all",
        }}
      >
        📁 프로젝트: {projectId}
      </div>

      {/* 메시지 */}
      {message && (
        <div
          style={{
            background: message.includes("✅") ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${message.includes("✅") ? "#86efac" : "#fca5a5"}`,
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            color: message.includes("✅") ? "#166534" : "#991b1b",
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </div>
      )}

      <Section title="🖼 이미지 업로드" hint="필수" defaultOpen>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: "#6b7280", fontWeight: 400, fontSize: 11 }}>.png .jpg .jpeg .webp</span>
        </div>
        <DropZone
          accept=".png,.jpg,.jpeg,.webp"
          label="클릭하거나 드래그해서 이미지 업로드"
          icon="🖼"
          onFiles={(files) => handleUpload(files, "image")}
          disabled={!!uploadingType}
          uploading={uploadingType === "image"}
        />
        {(fileList.images || []).length > 0 && (
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>업로드된 파일: {fileList.images.join(", ")}</div>
        )}
        {/* 씬별 이미지 매핑 */}
        {sceneIds.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 4 }}>씬별 이미지 매핑</div>
            {sceneIds.map((sceneId) => (
              <MappingRow
                key={sceneId}
                sceneId={sceneId}
                assetType="images"
                currentFile={assetMap.images?.[sceneId] || ""}
                availableFiles={fileList.images || []}
                projectId={projectId}
                onMapped={fetchAssets}
              />
            ))}
          </div>
        )}
      </Section>

      <hr style={{ border: 0, borderTop: "1px solid #e5e7eb" }} />

      <Section title="🎙 오디오 업로드" hint="필수" defaultOpen>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: "#6b7280", fontWeight: 400, fontSize: 11 }}>.mp3 .wav</span>
        </div>
        <DropZone
          accept=".mp3,.wav"
          label="클릭하거나 드래그해서 오디오 업로드"
          icon="🎙"
          onFiles={(files) => handleUpload(files, "audio")}
          disabled={!!uploadingType}
          uploading={uploadingType === "audio"}
        />
        {(fileList.audio || []).length > 0 && (
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>업로드된 파일: {fileList.audio.join(", ")}</div>
        )}
        {sceneIds.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 4 }}>씬별 오디오 매핑</div>
            {sceneIds.map((sceneId) => (
              <MappingRow
                key={sceneId}
                sceneId={sceneId}
                assetType="audio"
                currentFile={assetMap.audio?.[sceneId] || ""}
                availableFiles={fileList.audio || []}
                projectId={projectId}
                onMapped={fetchAssets}
              />
            ))}
          </div>
        )}
      </Section>

      <hr style={{ border: 0, borderTop: "1px solid #e5e7eb" }} />

      <Section title="🎵 BGM 업로드" hint="선택">
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: "#6b7280", fontWeight: 400, fontSize: 11 }}>.mp3 .wav</span>
        </div>
        <DropZone
          accept=".mp3,.wav"
          label="클릭하거나 드래그해서 BGM 업로드"
          icon="🎵"
          onFiles={(files) => handleUpload(files, "bgm")}
          disabled={!!uploadingType}
          uploading={uploadingType === "bgm"}
        />
        {(fileList.bgm || []).length > 0 && (
          <div style={{ fontSize: 11, color: "#6b7280" }}>업로드된 BGM: {fileList.bgm.join(", ")}</div>
        )}
      </Section>

      <hr style={{ border: 0, borderTop: "1px solid #e5e7eb" }} />

      <Section title="📝 자막 업로드" hint="선택">
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: "#6b7280", fontWeight: 400, fontSize: 11 }}>.srt .txt (선택)</span>
        </div>
        <DropZone
          accept=".srt,.txt"
          label="클릭하거나 드래그해서 자막 업로드 (선택사항)"
          icon="📝"
          onFiles={(files) => handleUpload(files, "subtitle")}
          disabled={!!uploadingType}
          uploading={uploadingType === "subtitle"}
        />
        {(fileList.subtitles || []).length > 0 && (
          <div style={{ fontSize: 11, color: "#6b7280" }}>업로드된 자막: {fileList.subtitles.join(", ")}</div>
        )}
      </Section>

      <hr style={{ border: 0, borderTop: "1px solid #e5e7eb" }} />

      <Section title="✅ 렌더 검증" hint="렌더 전에 한 번 확인">
        <ValidationPanel projectId={projectId} />
      </Section>

      {/* 새로고침 버튼 */}
      {loading ? (
        <div style={{ textAlign: "center", color: "#6b7280", fontSize: 12 }}>로딩 중...</div>
      ) : (
        <button
          onClick={fetchAssets}
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 8,
            background: "#fff",
            color: "#374151",
            padding: "7px 0",
            fontSize: 12,
            cursor: "pointer",
            width: "100%",
          }}
        >
          🔄 에셋 목록 새로고침
        </button>
      )}
    </div>
  );
}
