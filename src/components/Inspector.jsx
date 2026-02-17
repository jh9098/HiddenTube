import React, { useMemo, useState } from "react";
import { NODE_DEFS, ROLE_META } from "../workflow/nodeDefinitions.js";
import { buildOutputsMapFromNodes, gatherIncomingVars, renderTemplate, previewOf } from "../workflow/runner.js";

function Field({ field, value, onChange, roleType }) {
  // 커스텀 필드 타입 처리
  if (field.type === "roleSelect") {
    return (
      <select className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {ROLE_META.options.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (field.type === "providerSelect") {
    return (
      <select className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {ROLE_META.providers.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (field.type === "modelSelect") {
    const list = ROLE_META.modelsByRole[roleType] || ["Custom"];
    return (
      <select className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {list.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
        {!list.includes("Custom") ? <option value="Custom">Custom</option> : null}
      </select>
    );
  }

  const commonProps = {
    className:
      field.type === "textarea" ? "textarea" : field.type === "select" ? "select" : "input",
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
    placeholder: field.placeholder || "",
  };

  if (field.type === "textarea") return <textarea {...commonProps} />;
  if (field.type === "number") return <input {...commonProps} type="number" step="0.1" />;
  if (field.type === "select") {
    return (
      <select {...commonProps}>
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  return <input {...commonProps} type="text" />;
}

export default function Inspector({ selectedNode, nodes, edges, onPatchNodeData }) {
  const [fileObjectUrl, setFileObjectUrl] = useState("");

  const def = useMemo(() => {
    if (!selectedNode) return null;
    return NODE_DEFS[selectedNode.data.type] || null;
  }, [selectedNode]);

  const roleType = selectedNode?.data?.config?.roleType || "text";
  const fields = def?.fields || [];
  const cfg = selectedNode?.data?.config || {};

  const incomingVars = useMemo(() => {
    if (!selectedNode) return {};
    const outputsMap = buildOutputsMapFromNodes(nodes);
    return gatherIncomingVars(selectedNode.id, edges, outputsMap);
  }, [selectedNode, nodes, edges]);

  if (!selectedNode) {
    return (
      <div>
        <div className="h1">속성</div>
        <div className="card small">
          노드를 선택하면 설정(역할/모델/프롬프트/수동 결과)이 여기 표시됩니다.
        </div>
      </div>
    );
  }

  const applyRoleDefaults = (nextRole) => {
    const nextCfg = { ...cfg };
    nextCfg.roleType = nextRole;
    nextCfg.modelId = (ROLE_META.modelsByRole[nextRole] || ["Custom"])[0] || "Custom";
    nextCfg.outputKey = ROLE_META.defaultOutputKeyByRole[nextRole] || "result";
    nextCfg.instructions = ROLE_META.defaultInstructionsByRole[nextRole] || "";
    nextCfg.promptTemplate = ROLE_META.defaultPromptByRole[nextRole] || "";
    onPatchNodeData(selectedNode.id, { config: nextCfg });
  };

  const copyRenderedPrompt = async () => {
    const prompt = renderTemplate(cfg.promptTemplate, incomingVars);
    await navigator.clipboard.writeText(prompt);
    onPatchNodeData(selectedNode.id, { lastError: "" });
    alert("프롬프트를 클립보드에 복사했습니다.");
  };

  const applyManualResultToNodeOutput = () => {
    // outputKey에 manualText/Url/File을 패키징해서 저장
    const outKey = (cfg.outputKey || "result").trim() || "result";
    const payload = {};
    if (cfg.manualText?.trim()) payload[outKey] = cfg.manualText.trim();
    if (cfg.manualUrl?.trim()) payload[`${outKey}_url`] = cfg.manualUrl.trim();
    if (cfg.manualFileName?.trim()) payload[`${outKey}_file`] = cfg.manualFileName.trim();

    // 아무것도 없으면 최소 outKey라도 빈값으로 저장
    if (Object.keys(payload).length === 0) payload[outKey] = "";

    onPatchNodeData(selectedNode.id, {
      output: payload,
      outputPreview: previewOf(payload),
      status: "done",
      lastError: "",
    });
    alert("노드 출력(output)에 수동 결과를 적용했습니다. (status=done)");
  };

  const markStatus = (status) => {
    onPatchNodeData(selectedNode.id, { status });
  };

  return (
    <div>
      <div className="h1">속성</div>
      <div className="card">
        <div style={{ fontWeight: 800, marginBottom: 6 }}>{selectedNode.data.label}</div>
        <div className="kv">
          <span>id</span><b>{selectedNode.id}</b>
          <span>type</span><b>{selectedNode.data.type}</b>
          <span>status</span><b>{selectedNode.data.status}</b>
        </div>
        {selectedNode.data.lastError ? (
          <div style={{ marginTop: 10, color: "#ff6b6b", fontSize: 12 }}>
            에러: {selectedNode.data.lastError}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => markStatus("todo")}>TODO</button>
          <button className="btn" onClick={() => markStatus("doing")}>DOING</button>
          <button className="btn" onClick={() => markStatus("done")}>DONE</button>
        </div>
      </div>

      <div className="h2">설정</div>
      <div className="card">
        {fields.map((f) => (
          <div key={f.name} className="field">
            <div className="label">{f.label}</div>
            <Field
              field={f}
              roleType={roleType}
              value={cfg[f.name]}
              onChange={(val) => {
                // role 변경 시 기본값 자동 세팅
                if (f.name === "roleType") {
                  applyRoleDefaults(val);
                  return;
                }

                const nextCfg = { ...cfg };
                if (f.type === "number") {
                  const n = Number(val);
                  nextCfg[f.name] = Number.isFinite(n) ? n : 0;
                } else {
                  nextCfg[f.name] = val;
                }
                onPatchNodeData(selectedNode.id, { config: nextCfg });
              }}
            />
          </div>
        ))}

        {selectedNode.data.type === "generate" ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <button className="btn" onClick={copyRenderedPrompt}>Copy Prompt (렌더링)</button>
          </div>
        ) : null}
      </div>

      {selectedNode.data.type === "generate" ? (
        <>
          <div className="h2">이 노드로 들어오는 변수(업스트림 결과)</div>
          <div className="card small" style={{ whiteSpace: "pre-wrap" }}>
            {Object.keys(incomingVars).length ? JSON.stringify(incomingVars, null, 2) : "(없음) - 입력/이전 노드를 연결하세요."}
          </div>

          <div className="h2">수동 결과 입력(초기 MVP)</div>
          <div className="card">
            <div className="field">
              <div className="label">결과 텍스트(붙여넣기)</div>
              <textarea
                className="textarea"
                value={cfg.manualText || ""}
                onChange={(e) => onPatchNodeData(selectedNode.id, { config: { ...cfg, manualText: e.target.value } })}
                placeholder="AI 결과를 여기에 붙여넣으세요."
              />
            </div>

            <div className="field">
              <div className="label">결과 링크(URL)</div>
              <input
                className="input"
                value={cfg.manualUrl || ""}
                onChange={(e) => onPatchNodeData(selectedNode.id, { config: { ...cfg, manualUrl: e.target.value } })}
                placeholder="예: 이미지/오디오/영상 링크"
              />
            </div>

            <div className="field">
              <div className="label">파일(메타만 저장, 실제 파일은 저장 안 함)</div>
              <input
                className="input"
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;

                  // 파일 미리보기용(세션 내에서만)
                  if (fileObjectUrl) URL.revokeObjectURL(fileObjectUrl);
                  const url = URL.createObjectURL(f);
                  setFileObjectUrl(url);

                  onPatchNodeData(selectedNode.id, {
                    config: { ...cfg, manualFileName: f.name },
                  });
                }}
              />
              <div className="small" style={{ marginTop: 6 }}>
                선택됨: <b style={{ color: "#e8e8ea" }}>{cfg.manualFileName || "(없음)"}</b>
              </div>
              {fileObjectUrl ? (
                <div className="small" style={{ marginTop: 6 }}>
                  미리보기(세션 한정): <a href={fileObjectUrl} target="_blank" rel="noreferrer">open</a>
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn primary" onClick={applyManualResultToNodeOutput}>
                Apply to Node Output + Mark Done
              </button>
            </div>
          </div>
        </>
      ) : null}

      <div className="h2">출력 프리뷰</div>
      <div className="card small" style={{ whiteSpace: "pre-wrap" }}>
        {selectedNode.data.outputPreview || "(아직 없음)"}
      </div>
    </div>
  );
}
