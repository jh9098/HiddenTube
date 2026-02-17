import React, { useMemo, useState } from "react";
import { NODE_DEFS, META } from "../workflow/nodeDefinitions.js";
import {
  buildOutputsMapFromNodes,
  gatherIncomingVars,
  renderTemplate,
  previewOf,
} from "../workflow/runner.js";

function Field({ field, value, onChange, capability }) {
  if (field.type === "capabilitySelect") {
    return (
      <select className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {META.capabilities.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === "providerSelect") {
    return (
      <select className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {META.providers.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === "modelSelect") {
    const list = META.modelsByCapability[capability] || ["Custom"];
    return (
      <select className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {list.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
        {!list.includes("Custom") ? <option value="Custom">Custom</option> : null}
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
  const capability = cfg.capability || "custom";

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
          노드를 선택하면 설정(할 일/프롬프트/수동 결과/자산)이 표시됩니다.
        </div>
      </div>
    );
  }

  const markStatus = (status) => {
    onPatchNodeData(selectedNode.id, { status });
  };

  const copyRenderedPrompt = async () => {
    const prompt = renderTemplate(cfg.promptTemplate || "", incomingVars);
    await navigator.clipboard.writeText(prompt);
    alert("프롬프트를 클립보드에 복사했습니다.");
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
    const outKey = (cfg.outputKey || "").trim() || "result";
    const payload = {};

    if (cfg.manualText?.trim()) payload[outKey] = cfg.manualText.trim();
    if (cfg.manualUrl?.trim()) payload[`${outKey}_url`] = cfg.manualUrl.trim();
    if (cfg.manualFileName?.trim()) payload[`${outKey}_file`] = cfg.manualFileName.trim();

    if (Object.keys(payload).length === 0) payload[outKey] = "";

    onPatchNodeData(selectedNode.id, {
      output: payload,
      outputPreview: previewOf(payload),
      status: "done",
      lastError: "",
    });
    alert("수동 결과를 output에 적용했습니다. (status=done)");
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

  const onCapabilityChanged = (nextCap) => {
    const nextCfg = { ...cfg };
    nextCfg.capability = nextCap;
    const models = META.modelsByCapability[nextCap] || ["Custom"];
    nextCfg.modelId = models[0] || "Custom";
    nextCfg.outputKey = META.defaultOutputKeyByCapability[nextCap] || "result";

    if (!nextCfg.todo || nextCfg.todo.trim().length === 0) {
      nextCfg.todo = META.defaultTodoByCapability[nextCap] || "";
    }
    if (!nextCfg.promptTemplate || nextCfg.promptTemplate.trim().length === 0) {
      nextCfg.promptTemplate = META.defaultPromptByCapability[nextCap] || "";
    }
    onPatchNodeData(selectedNode.id, { config: nextCfg });
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
              capability={capability}
              value={cfg[f.name]}
              onChange={(val) => {
                if (selectedNode.data.type === "generate" && f.name === "capability") {
                  onCapabilityChanged(val);
                  return;
                }
                const nextCfg = { ...cfg, [f.name]: val };
                onPatchNodeData(selectedNode.id, { config: nextCfg });
              }}
            />
          </div>
        ))}

        {selectedNode.data.type === "generate" ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <button className="btn" onClick={copyRenderedPrompt}>Copy Prompt (업스트림 반영)</button>
          </div>
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
          <div className="h2">업스트림 변수(참고)</div>
          <div className="card small" style={{ whiteSpace: "pre-wrap" }}>
            {Object.keys(incomingVars).length ? JSON.stringify(incomingVars, null, 2) : "(없음) - Input/Asset/이전 노드를 연결하세요."}
          </div>

          <div className="h2">수동 결과 입력</div>
          <div className="card">
            <div className="field">
              <div className="label">결과 텍스트(붙여넣기)</div>
              <textarea
                className="textarea"
                value={cfg.manualText || ""}
                onChange={(e) => onPatchNodeData(selectedNode.id, { config: { ...cfg, manualText: e.target.value } })}
                placeholder="AI 결과(대본/요약/표 등)를 여기에 붙여넣으세요."
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
            {/* ✅ YouTube 선택 시 URL만 입력 */}
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
