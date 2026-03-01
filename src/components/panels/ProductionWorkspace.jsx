import React, { useEffect, useMemo, useState } from "react";
import {
  createProject,
  getAssets,
  remapAsset,
  updateProject,
  uploadAssets,
  validateRender,
} from "../../api/projectApi";
import {
  createRenderJob,
  getRenderJob,
  getRenderLogUrl,
  getRenderResultUrl,
  getRenderThumbnailUrl,
} from "../../api/renderApi";
import { buildProjectPayload, parseRenderJsonFromNodes } from "../project/projectWorkflowStatus";

const INITIAL_ASSETS = { assets: {}, asset_map: { images: {}, audio: {}, subtitles: {} }, scene_ids: [] };

function readSubtitleCount(scene) {
  const subtitleLines = scene?.subtitle_lines;
  if (!Array.isArray(subtitleLines)) return 0;
  return subtitleLines.filter((line) => {
    if (typeof line === "string") return line.trim().length > 0;
    if (line && typeof line === "object") return String(line.text ?? "").trim().length > 0;
    return false;
  }).length;
}

function ProductionWorkspace({ nodes, edges, onMessage }) {
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("내 프로젝트");
  const [manualMap, setManualMap] = useState({});
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [validation, setValidation] = useState(null);
  const [renderJob, setRenderJob] = useState(null);
  const [renderPolling, setRenderPolling] = useState(false);
  const [preset, setPreset] = useState("9:16");

  const payload = useMemo(() => buildProjectPayload({ title, nodes, edges }), [title, nodes, edges]);
  const renderJson = useMemo(() => parseRenderJsonFromNodes(nodes), [nodes]);
  const scenes = Array.isArray(renderJson?.scenes) ? renderJson.scenes : [];

  const sceneChecks = useMemo(() => {
    const imageMap = assets.asset_map?.images ?? {};
    const audioMap = assets.asset_map?.audio ?? {};
    const subtitleMap = assets.asset_map?.subtitles ?? {};

    return scenes.map((scene) => {
      const sceneId = String(scene?.scene_id ?? "");
      return {
        sceneId,
        expectedDuration: Number(scene?.duration_sec || 0),
        subtitlePromptLineCount: readSubtitleCount(scene),
        image: imageMap[sceneId] ?? "",
        audio: audioMap[sceneId] ?? "",
        subtitle: subtitleMap[sceneId] ?? "",
      };
    });
  }, [scenes, assets]);

  useEffect(() => {
    if (!renderJob?.job_id || !renderPolling) return;
    if (renderJob.status === "done" || renderJob.status === "failed") {
      setRenderPolling(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setRenderJob(await getRenderJob(renderJob.job_id));
      } catch (error) {
        setRenderPolling(false);
        onMessage?.(`렌더 상태 조회 실패: ${error.message}`);
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [renderJob, renderPolling, onMessage]);

  const syncAssets = async (targetProjectId) => {
    setAssets(await getAssets(targetProjectId));
  };

  const ensureProject = async () => {
    if (projectId) return projectId;
    const created = await createProject(payload);
    setProjectId(created.project_id);
    onMessage?.(`프로젝트 생성 완료: ${created.project_id}`);
    return created.project_id;
  };

  const handleSaveProject = async () => {
    const targetProjectId = await ensureProject();
    await updateProject(targetProjectId, payload);
    await syncAssets(targetProjectId);
    onMessage?.("Preview 결과(JSON 포함)를 프로젝트에 저장했습니다.");
  };

  const handleUpload = async (type, event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const targetProjectId = await ensureProject();
    const sceneId = manualMap[`${type}_upload_scene`] ?? "";
    const uploadedList = await uploadAssets(targetProjectId, type, files, sceneId);

    uploadedList.forEach((uploaded) => {
      onMessage?.(`${uploaded.filename} 업로드 완료 (${uploaded.mapping_status})`);
    });

    onMessage?.(`${uploadedList.length}개 ${type} 파일 업로드 완료`);
    await syncAssets(targetProjectId);
  };

  const handleRemap = async (kind, sceneId) => {
    const targetProjectId = await ensureProject();
    const filename = manualMap[`${kind}_${sceneId}`];
    if (!filename) return;
    await remapAsset(targetProjectId, { kind, scene_id: sceneId, filename });
    onMessage?.(`${sceneId}에 ${filename} 매핑 완료`);
    await syncAssets(targetProjectId);
  };

  const handleValidate = async () => {
    const targetProjectId = await ensureProject();
    await updateProject(targetProjectId, payload);
    const result = await validateRender(targetProjectId);
    setValidation(result);
    onMessage?.(result.valid ? "검증 통과" : "검증 실패(오류 확인 필요)");
  };

  const handleRender = async () => {
    const targetProjectId = await ensureProject();
    const hasMissingScene = sceneChecks.some((item) => !item.image || !item.audio || !item.subtitle);
    if (hasMissingScene) {
      onMessage?.("scene 매핑 누락이 있습니다. 이미지/자막/오디오를 모두 연결해 주세요.");
      return;
    }

    const job = await createRenderJob(targetProjectId, { preset });
    setRenderJob(job);
    setRenderPolling(true);
    onMessage?.(`렌더 시작: ${job.job_id} (preset ${preset})`);
  };

  const resultUrl = renderJob?.job_id ? getRenderResultUrl(renderJob.job_id) : "";
  const thumbUrl = renderJob?.job_id ? getRenderThumbnailUrl(renderJob.job_id) : "";
  const logUrl = renderJob?.job_id ? getRenderLogUrl(renderJob.job_id) : "";

  return (
    <section className="execution-pane production-pane">
      <h3 className="execution-node-title">Production 작업 공간</h3>
      <p className="panel-help">Preview에서 만든 Render JSON을 기준으로 실제 생성물을 업로드하고 매핑/검증/합성까지 진행합니다.</p>

      <article className="console-item">
        <h4>0) 프로젝트 저장</h4>
        <div className="field">
          <label>project_id</label>
          <input value={projectId} onChange={(event) => setProjectId(event.target.value)} placeholder="proj_xxxxx" />
        </div>
        <div className="field">
          <label>title</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="panel-actions">
          <button type="button" className="toolbar-btn" onClick={() => void handleSaveProject()}>Preview 결과 저장</button>
        </div>
      </article>

      <article className="console-item">
        <h4>1) AI 결과물 수집</h4>
        <div className="field">
          <label>이미지 업로드 (png/jpg/webp)</label>
          <input
            placeholder="선택 scene_id(옵션)"
            value={manualMap.image_upload_scene || ""}
            onChange={(event) => setManualMap((prev) => ({ ...prev, image_upload_scene: event.target.value }))}
          />
          <input type="file" accept=".png,.jpg,.jpeg,.webp" multiple onChange={(event) => void handleUpload("image", event)} />
        </div>
        <div className="field">
          <label>자막 업로드 (.srt/.txt)</label>
          <input
            placeholder="선택 scene_id(옵션)"
            value={manualMap.subtitle_upload_scene || ""}
            onChange={(event) => setManualMap((prev) => ({ ...prev, subtitle_upload_scene: event.target.value }))}
          />
          <input type="file" accept=".srt,.txt" multiple onChange={(event) => void handleUpload("subtitle", event)} />
        </div>
        <div className="field">
          <label>음성 업로드 (mp3/wav)</label>
          <input
            placeholder="선택 scene_id(옵션)"
            value={manualMap.audio_upload_scene || ""}
            onChange={(event) => setManualMap((prev) => ({ ...prev, audio_upload_scene: event.target.value }))}
          />
          <input type="file" accept=".mp3,.wav" multiple onChange={(event) => void handleUpload("audio", event)} />
        </div>
      </article>

      <article className="console-item">
        <h4>2) JSON 기반 자산 매핑</h4>
        <div className="mapping-table">
          {sceneChecks.map((item) => (
            <div key={item.sceneId} className="mapping-row">
              <strong>{item.sceneId}</strong>
              <small>예상 duration: {item.expectedDuration || "미지정"}초 / 자막 프롬프트 라인: {item.subtitlePromptLineCount}</small>

              <select
                className={!item.image ? "map-select missing" : "map-select"}
                value={manualMap[`images_${item.sceneId}`] ?? item.image}
                onChange={(event) => setManualMap((prev) => ({ ...prev, [`images_${item.sceneId}`]: event.target.value }))}
              >
                <option value="">이미지 선택</option>
                {(assets.assets?.images ?? []).map((file) => <option key={file} value={file}>{file}</option>)}
              </select>
              <button type="button" className="toolbar-btn" onClick={() => void handleRemap("images", item.sceneId)}>이미지 매핑</button>

              <select
                className={!item.subtitle ? "map-select missing" : "map-select"}
                value={manualMap[`subtitles_${item.sceneId}`] ?? item.subtitle}
                onChange={(event) => setManualMap((prev) => ({ ...prev, [`subtitles_${item.sceneId}`]: event.target.value }))}
              >
                <option value="">자막 선택</option>
                {(assets.assets?.subtitles ?? []).map((file) => <option key={file} value={file}>{file}</option>)}
              </select>
              <button type="button" className="toolbar-btn" onClick={() => void handleRemap("subtitles", item.sceneId)}>자막 매핑</button>

              <select
                className={!item.audio ? "map-select missing" : "map-select"}
                value={manualMap[`audio_${item.sceneId}`] ?? item.audio}
                onChange={(event) => setManualMap((prev) => ({ ...prev, [`audio_${item.sceneId}`]: event.target.value }))}
              >
                <option value="">음성 선택</option>
                {(assets.assets?.audio ?? []).map((file) => <option key={file} value={file}>{file}</option>)}
              </select>
              <button type="button" className="toolbar-btn" onClick={() => void handleRemap("audio", item.sceneId)}>음성 매핑</button>
            </div>
          ))}
          {sceneChecks.length === 0 && <p className="warn-text">Render JSON scene 정보가 없습니다. Preview에서 RenderJsonNode를 먼저 저장하세요.</p>}
        </div>
        <div className="panel-actions">
          <button type="button" className="toolbar-btn" onClick={() => void handleValidate()}>누락/기본 검증 실행</button>
        </div>
        {validation && (
          <div className="validation-panel">
            <p className={validation.valid ? "ok-text" : "error-text"}>{validation.valid ? "검증 통과" : "오류 있음"}</p>
            {(validation.issues ?? []).map((issue, index) => (
              <p key={`${issue.code}-${index}`} className={issue.level === "error" ? "error-text" : "warn-text"}>
                [{issue.level}] {issue.scene_id ? `${issue.scene_id}: ` : ""}{issue.message}
              </p>
            ))}
          </div>
        )}
      </article>

      <article className="console-item">
        <h4>3) FFmpeg 합성 실행</h4>
        <div className="field">
          <label>합성 preset</label>
          <select value={preset} onChange={(event) => setPreset(event.target.value)}>
            <option value="9:16">9:16 (Shorts)</option>
            <option value="16:9">16:9 (Landscape)</option>
          </select>
        </div>
        <div className="panel-actions">
          <button type="button" className="toolbar-btn" onClick={() => void handleRender()}>
            합성 실행
          </button>
        </div>

        {renderJob && (
          <div className="validation-panel">
            <p>상태: <strong>{renderJob.status}</strong> ({renderJob.progress}%)</p>
            {renderJob.error_message && <p className="error-text">{renderJob.error_message}</p>}
            <div className="result-links">
              {logUrl && <a className="toolbar-btn" href={logUrl} target="_blank" rel="noreferrer">실행 로그 다운로드</a>}
              {resultUrl && <a className="toolbar-btn" href={resultUrl} target="_blank" rel="noreferrer">완성본 다운로드</a>}
            </div>
            {thumbUrl && <img className="result-thumbnail" src={thumbUrl} alt="render thumbnail" />}
            {resultUrl && <video className="result-video" src={resultUrl} controls />}
          </div>
        )}
      </article>
    </section>
  );
}

export default ProductionWorkspace;
