import React, { useMemo, useState } from "react";
import { NODE_DEFS, META } from "../workflow/nodeDefinitions.js";
import { buildOutputsMapFromNodes, gatherIncomingVars, previewOf } from "../workflow/runner.js";
import { buildModelInputPrompt, extractVarKeys } from "../workflow/promptComposer.js";
import { tryParseJsonObject } from "../workflow/responseSchema.js";

function Field({ field, value, onChange }) {
  if (field.type === "modelSelect") {
    return (
      <select className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {META.models.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    );
  }

  if (field.type === "assetSourceSelect") {
    return (
      <select className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {META.assetSources.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
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

  const fields = def?.fields || [];
  const cfg = selectedNode?.data?.config || {};

  const incomingVars = useMemo(() => {
    if (!selectedNode) return {};
    const outputsMap = buildOutputsMapFromNodes(nodes);
    return gatherIncomingVars(selectedNode.id, edges, outputsMap);
  }, [selectedNode, nodes, edges]);

  const incomingNodeNames = useMemo(() => {
    if (!selectedNode) return [];
    const sourceIds = edges.filter((e) => e.target === selectedNode.id).map((e) => e.source);
    return Array.from(
      new Set(sourceIds.map((id) => nodes.find((n) => n.id === id)?.data?.label || id).filter(Boolean))
    );
  }, [selectedNode, edges, nodes]);

  if (!selectedNode) {
    return (
      <div>
        <div className="h1">속성</div>
        <div className="card small">
          노드를 선택하면 설정(prompt/수동 결과/자산)이 표시됩니다.
        </div>
      </div>
    );
  }

  const markStatus = (status) => {
    onPatchNodeData(selectedNode.id, { status });
  };

  const copyRenderedPrompt = async () => {
    const prompt = buildModelInputPrompt(cfg.prompt || "", incomingVars, incomingNodeNames);
    await navigator.clipboard.writeText(prompt);
    alert("모델 입력용 프롬프트를 복사했습니다.");
  };

  const applyInputAsOutput = () => {
    const key = (cfg.key || "").trim() || "topic";
    const val = cfg.value ?? "";
    const payload = { [key]: val };
    onPatchNodeData(selectedNode.id, {
      output: payload,
      outputPreview: previewOf(payload),
      status: "done",
      lastError: "",
    });
  };

  const applyGenerateManualToOutput = () => {
    const payload = {};
    const manualText = cfg.manualText?.trim() || "";

    if (manualText) {
      payload.result_text = manualText;
      const parsed = tryParseJsonObject(manualText);
      if (parsed) {
        payload.result_text = parsed;
        payload.result_text_raw = manualText;
      }
    }
    if (cfg.manualUrl?.trim()) payload.result_url = cfg.manualUrl.trim();
    if (cfg.manualFileName?.trim()) payload.result_file = cfg.manualFileName.trim();

    if (Object.keys(payload).length === 0) payload.result_text = "";

    onPatchNodeData(selectedNode.id, {
      output: payload,
      outputPreview: previewOf(payload),
      status: "done",
      lastError: "",
    });
    alert("수동 결과를 output에 적용했습니다. (다운스트림 노드에서 참조 가능)");
  };

  const applyAssetToOutput = () => {
    const key = (cfg.assetKey || "").trim() || "asset";
    const payload = {};

    if (cfg.url?.trim()) payload[`${key}_url`] = cfg.url.trim();
    if (cfg.text?.trim()) payload[`${key}_text`] = cfg.text.trim();
    if (cfg.fileName?.trim()) payload[`${key}_file`] = cfg.fileName.trim();

    payload[`${key}_meta`] = {
      title: cfg.title || "",
      source: cfg.source || "",
      notes: cfg.notes || "",
    };

    onPatchNodeData(selectedNode.id, {
      output: payload,
      outputPreview: previewOf(payload),
      status: "done",
      lastError: "",
    });
    alert("Asset을 output에 적용했습니다. (status=done)");
  };

  const isAssetYoutube = selectedNode.data.type === "asset" && (cfg.source === "youtube");

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
              value={cfg[f.name]}
              onChange={(val) => {
                const nextCfg = { ...cfg, [f.name]: val };
                onPatchNodeData(selectedNode.id, { config: nextCfg });
              }}
            />
          </div>
        ))}

        {selectedNode.data.type === "generate" ? (
          <>
            <div className="small" style={{ marginTop: 2 }}>
              연결 노드 답변 + 현재 prompt를 합쳐서 모델 입력 프롬프트를 생성합니다.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button className="btn" onClick={copyRenderedPrompt}>Copy Prompt (업스트림 반영)</button>
            </div>
          </>
        ) : null}
      </div>

      {selectedNode.data.type === "input" ? (
        <>
          <div className="h2">Input → Output 적용</div>
          <div className="card">
            <div className="small">Input은 변수로 내려가야 하므로, 아래 버튼으로 output에 반영하세요.</div>
            <div style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={applyInputAsOutput}>Apply Input as Output</button>
            </div>
          </div>
        </>
      ) : null}

      {selectedNode.data.type === "generate" ? (
        <>
          <div className="h2">업스트림 답변(참고)</div>
          <div className="card small" style={{ whiteSpace: "pre-wrap" }}>
            {Object.keys(incomingVars).length ? JSON.stringify(incomingVars, null, 2) : "(없음) - Input/Asset/이전 노드를 연결하세요."}
          </div>
          <div className="small" style={{ marginTop: 6 }}>
            참조한 연결 노드: {incomingNodeNames.join(", ") || "없음"}
            <br />
            사용 가능한 업스트림 키: {extractVarKeys(incomingVars).join(", ") || "없음"}
          </div>

          <div className="h2">수동 결과 입력</div>
          <div className="card">
            <div className="field">
              <div className="label">결과 텍스트(붙여넣기)</div>
              <textarea
                className="textarea"
                value={cfg.manualText || ""}
                onChange={(e) => onPatchNodeData(selectedNode.id, { config: { ...cfg, manualText: e.target.value } })}
                placeholder="모델 응답(답변)을 여기에 붙여넣으세요."
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
              <div className="label">파일(메타 저장 + 세션 미리보기)</div>
              <input
                className="input"
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (fileObjectUrl) URL.revokeObjectURL(fileObjectUrl);
                  const url = URL.createObjectURL(f);
                  setFileObjectUrl(url);
                  onPatchNodeData(selectedNode.id, { config: { ...cfg, manualFileName: f.name } });
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

            <button className="btn primary" onClick={applyGenerateManualToOutput}>
              Apply to Output + Mark Done
            </button>
          </div>
        </>
      ) : null}

      {selectedNode.data.type === "asset" ? (
        <>
          <div className="h2">Asset 값</div>
          <div className="card">
            {isAssetYoutube ? (
              <>
                <div className="small" style={{ marginBottom: 8 }}>
                  이 노드는 “참고용 YouTube 링크”를 저장합니다. (추후 API 연동 시 이 URL을 기준으로 동작)
                </div>
                <div className="field">
                  <div className="label">YouTube URL</div>
                  <input
                    className="input"
                    value={cfg.url || ""}
                    onChange={(e) => onPatchNodeData(selectedNode.id, { config: { ...cfg, url: e.target.value } })}
                    placeholder="예: https://www.youtube.com/watch?v=..."
                  />
                </div>
                <button className="btn primary" onClick={applyAssetToOutput}>
                  Apply YouTube URL as Output + Mark Done
                </button>
              </>
            ) : (
              <>
                <div className="field">
                  <div className="label">URL</div>
                  <input
                    className="input"
                    value={cfg.url || ""}
                    onChange={(e) => onPatchNodeData(selectedNode.id, { config: { ...cfg, url: e.target.value } })}
                    placeholder="YouTube/Drive/외부 링크"
                  />
                </div>

                <div className="field">
                  <div className="label">Text</div>
                  <textarea
                    className="textarea"
                    value={cfg.text || ""}
                    onChange={(e) => onPatchNodeData(selectedNode.id, { config: { ...cfg, text: e.target.value } })}
                    placeholder="외부자료 요약/메모/스크립트 등"
                  />
                </div>

                <div className="field">
                  <div className="label">파일(메타 저장 + 세션 미리보기)</div>
                  <input
                    className="input"
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (fileObjectUrl) URL.revokeObjectURL(fileObjectUrl);
                      const url = URL.createObjectURL(f);
                      setFileObjectUrl(url);
                      onPatchNodeData(selectedNode.id, { config: { ...cfg, fileName: f.name } });
                    }}
                  />
                  <div className="small" style={{ marginTop: 6 }}>
                    선택됨: <b style={{ color: "#e8e8ea" }}>{cfg.fileName || "(없음)"}</b>
                  </div>
                  {fileObjectUrl ? (
                    <div className="small" style={{ marginTop: 6 }}>
                      미리보기(세션 한정): <a href={fileObjectUrl} target="_blank" rel="noreferrer">open</a>
                    </div>
                  ) : null}
                </div>

                <button className="btn primary" onClick={applyAssetToOutput}>
                  Apply Asset as Output + Mark Done
                </button>
              </>
            )}
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
