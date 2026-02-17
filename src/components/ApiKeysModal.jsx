// /src/components/ApiKeysModal.jsx
import React, { useMemo, useState } from "react";
import { maskKey } from "../workflow/apiKeys.js";

function FieldRow({ label, value, onChange, placeholder, type = "password" }) {
  return (
    <div className="field">
      <div className="label">{label}</div>
      <input
        className="input"
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
        autoComplete="off"
      />
    </div>
  );
}

export default function ApiKeysModal({ open, keysObj, onClose, onSave }) {
  const [draft, setDraft] = useState(keysObj);

  // open 될 때마다 최신값 반영
  React.useEffect(() => {
    if (open) setDraft(keysObj);
  }, [open, keysObj]);

  const maskedSummary = useMemo(() => {
    const g = draft?.google || {};
    const y = draft?.youtube || {};
    return {
      googleGeneral: maskKey(g.general),
      googleResearch: maskKey(g.research),
      googleText: maskKey(g.text),
      googleImage: maskKey(g.image),
      googleVoice: maskKey(g.voice),
      googleVideo: maskKey(g.video),
      googleMusic: maskKey(g.music),
      youtubeApiKey: maskKey(y.apiKey),
      youtubeClientId: maskKey(y.clientId),
      youtubeClientSecret: maskKey(y.clientSecret),
    };
  }, [draft]);

  if (!open) return null;

  const patch = (path, value) => {
    const next = structuredClone(draft);
    const segs = path.split(".");
    let cur = next;
    for (let i = 0; i < segs.length - 1; i++) {
      const k = segs[i];
      if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
      cur = cur[k];
    }
    cur[segs[segs.length - 1]] = value;
    setDraft(next);
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 18,
      }}
      onMouseDown={(e) => {
        // 바깥 클릭 닫기
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(860px, 96vw)",
          maxHeight: "88vh",
          overflow: "auto",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(18,20,27,0.98)",
          padding: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>API Keys</div>
          <div className="small">로컬 저장(localStorage)만 사용</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn" onClick={onClose}>Close</button>
            <button className="btn primary" onClick={handleSave}>Save</button>
          </div>
        </div>

        <div className="h2">요약(마스킹)</div>
        <div className="card small" style={{ whiteSpace: "pre-wrap" }}>
{`Google general: ${maskedSummary.googleGeneral}
Google research: ${maskedSummary.googleResearch}
Google text: ${maskedSummary.googleText}
Google image: ${maskedSummary.googleImage}
Google voice: ${maskedSummary.googleVoice}
Google video: ${maskedSummary.googleVideo}
Google music: ${maskedSummary.googleMusic}

YouTube apiKey: ${maskedSummary.youtubeApiKey}
YouTube clientId: ${maskedSummary.youtubeClientId}
YouTube clientSecret: ${maskedSummary.youtubeClientSecret}`}
        </div>

        <div className="h2">Google (Gemini/Imagen/Veo/AudioLM/Lyria)</div>
        <div className="card">
          <FieldRow
            label="Google - general (공통)"
            value={draft?.google?.general || ""}
            onChange={(v) => patch("google.general", v)}
            placeholder="예: Gemini 공통 키(선택)"
          />
          <div className="small" style={{ margin: "6px 0 12px 0" }}>
            기능별 키가 있다면 아래에 별도 입력. 없으면 general만으로도 운영 가능.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FieldRow label="Google - research" value={draft?.google?.research || ""} onChange={(v) => patch("google.research", v)} />
            <FieldRow label="Google - text" value={draft?.google?.text || ""} onChange={(v) => patch("google.text", v)} />
            <FieldRow label="Google - image" value={draft?.google?.image || ""} onChange={(v) => patch("google.image", v)} />
            <FieldRow label="Google - voice" value={draft?.google?.voice || ""} onChange={(v) => patch("google.voice", v)} />
            <FieldRow label="Google - video" value={draft?.google?.video || ""} onChange={(v) => patch("google.video", v)} />
            <FieldRow label="Google - music" value={draft?.google?.music || ""} onChange={(v) => patch("google.music", v)} />
          </div>
        </div>

        <div className="h2">YouTube (수동 운영 → 추후 업로드 자동화 대비)</div>
        <div className="card">
          <FieldRow
            label="YouTube Data API Key"
            value={draft?.youtube?.apiKey || ""}
            onChange={(v) => patch("youtube.apiKey", v)}
            placeholder="API Key"
          />
          <div className="small" style={{ margin: "6px 0 12px 0" }}>
            업로드 자동화를 하려면 OAuth가 필요하므로 clientId/secret도 미리 저장 가능하게 해둠.
          </div>
          <FieldRow
            label="YouTube OAuth Client ID"
            value={draft?.youtube?.clientId || ""}
            onChange={(v) => patch("youtube.clientId", v)}
            placeholder="Client ID"
          />
          <FieldRow
            label="YouTube OAuth Client Secret"
            value={draft?.youtube?.clientSecret || ""}
            onChange={(v) => patch("youtube.clientSecret", v)}
            placeholder="Client Secret"
          />
        </div>

        <div className="h2">안내</div>
        <div className="card small">
          - 지금 단계에서는 API를 실제 호출하지 않음(수동 워크플로우).<br />
          - 다만 향후 자동화에서 그대로 사용할 수 있도록 “저장/조회” 구조만 먼저 깔아둠.
        </div>
      </div>
    </div>
  );
}
