import React, { useEffect, useMemo, useState } from "react";
import {
  createProject,
  getAssets,
  getProject,
  remapAsset,
  updateProject,
  uploadAsset,
  validateRender,
} from "../../api/projectApi";
import {
  createRenderJob,
  getRenderJob,
  getRenderLogUrl,
  getRenderResultUrl,
  getRenderThumbnailUrl,
} from "../../api/renderApi";
import { buildProjectPayload, summarizeProjectReadiness } from "./projectWorkflowStatus";
import ProjectStatusOverview from "./ProjectStatusOverview";
import RenderJobStatusPanel from "./RenderJobStatusPanel";

const INITIAL_ASSETS = { assets: {}, asset_map: { images: {}, audio: {} }, scene_ids: [] };

function ProjectAssetsPanel({ nodes, edges, onMessage, onLoadWorkflow }) {
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("내 프로젝트");
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [validation, setValidation] = useState(null);
  const [manualMap, setManualMap] = useState({});
  const [renderJob, setRenderJob] = useState(null);
  const [renderPolling, setRenderPolling] = useState(false);

  const currentPayload = useMemo(() => buildProjectPayload({ title, nodes, edges }), [title, nodes, edges]);
  const readiness = useMemo(
    () => summarizeProjectReadiness({ nodes, assets, validation }),
    [nodes, assets, validation]
  );

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
        onMessage(`렌더 상태 조회 실패: ${error.message}`);
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [renderJob, renderPolling, onMessage]);

  const syncAssets = async (targetProjectId) => setAssets(await getAssets(targetProjectId));

  const handleCreateProject = async () => {
    const created = await createProject(currentPayload);
    setProjectId(created.project_id);
    onMessage(`프로젝트 생성 완료: ${created.project_id}`);
    await syncAssets(created.project_id);
  };

  const handleSaveProject = async () => {
    if (!projectId) return onMessage("프로젝트를 먼저 생성하세요.");
    await updateProject(projectId, currentPayload);
    onMessage("프로젝트 데이터를 서버에 저장했습니다.");
  };

  const handleLoadProject = async () => {
    if (!projectId) return onMessage("불러올 project_id를 입력하세요.");
    const loaded = await getProject(projectId);
    setTitle(loaded.title || "");
    if (loaded.workflow_json?.nodes && loaded.workflow_json?.edges && onLoadWorkflow) {
      onLoadWorkflow(loaded.workflow_json);
    }
    await syncAssets(projectId);
    onMessage("프로젝트 메타/자산/워크플로우 정보를 불러왔습니다.");
  };

  const handleUpload = async (type, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !projectId) return;

    const sceneId = manualMap[`${type}_upload_scene`] ?? "";
    const uploaded = await uploadAsset(projectId, type, file, sceneId);
    onMessage(`${uploaded.filename} 업로드 완료 (${uploaded.mapping_status})`);
    await syncAssets(projectId);
  };

  const handleRemap = async (kind, sceneId) => {
    const filename = manualMap[`${kind}_${sceneId}`];
    if (!filename || !projectId) return;
    await remapAsset(projectId, { kind, scene_id: sceneId, filename });
    onMessage(`${sceneId}에 ${filename} 수동 매핑 완료`);
    await syncAssets(projectId);
  };

  const handleValidate = async () => {
    if (!projectId) return onMessage("검증할 project_id가 필요합니다.");
    const result = await validateRender(projectId);
    setValidation(result);
    onMessage(result.valid ? "검증 통과" : "검증 실패(오류 확인 필요)");
  };

  const handleRender = async () => {
    if (!projectId) return onMessage("렌더를 시작하려면 project_id가 필요합니다.");
    const job = await createRenderJob(projectId);
    setRenderJob(job);
    setRenderPolling(true);
    onMessage(`렌더 시작: ${job.job_id}`);
  };

  const resultUrl = renderJob?.job_id ? getRenderResultUrl(renderJob.job_id) : "";
  const thumbUrl = renderJob?.job_id ? getRenderThumbnailUrl(renderJob.job_id) : "";
  const logUrl = renderJob?.job_id ? getRenderLogUrl(renderJob.job_id) : "";

  return (
    <section className="project-assets-panel">
      <h3>프로젝트 저장 + 자산 매핑 + 렌더</h3>
      <ProjectStatusOverview readiness={readiness} />

      <div className="field"><label>project_id</label><input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="proj_xxxxx"/></div>
      <div className="field"><label>title</label><input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="panel-actions">
        <button type="button" className="toolbar-btn" onClick={handleCreateProject}>프로젝트 생성</button>
        <button type="button" className="toolbar-btn" onClick={handleSaveProject}>프로젝트 저장</button>
        <button type="button" className="toolbar-btn" onClick={handleLoadProject}>프로젝트 불러오기</button>
      </div>

      <h4>자산 업로드</h4>
      <div className="field">
        <label>이미지 업로드 (png/jpg/webp)</label>
        <input placeholder="선택 scene_id(옵션)" value={manualMap.image_upload_scene || ""} onChange={(e) => setManualMap((prev) => ({ ...prev, image_upload_scene: e.target.value }))}/>
        <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(event) => void handleUpload("image", event)} />
      </div>
      <div className="field">
        <label>오디오 업로드 (mp3/wav)</label>
        <input placeholder="선택 scene_id(옵션)" value={manualMap.audio_upload_scene || ""} onChange={(e) => setManualMap((prev) => ({ ...prev, audio_upload_scene: e.target.value }))}/>
        <input type="file" accept=".mp3,.wav" onChange={(event) => void handleUpload("audio", event)} />
      </div>
      <div className="field">
        <label>BGM 업로드 (선택)</label>
        <input type="file" accept=".mp3,.wav" onChange={(event) => void handleUpload("bgm", event)} />
      </div>

      <h4>장면별 매핑</h4>
      <div className="mapping-table">
        {assets.scene_ids?.map((sceneId) => {
          const mappedImage = assets.asset_map?.images?.[sceneId] ?? "";
          const mappedAudio = assets.asset_map?.audio?.[sceneId] ?? "";
          return (
            <div key={sceneId} className="mapping-row">
              <strong>{sceneId}</strong>
              <select className={!mappedImage ? "map-select missing" : "map-select"} value={manualMap[`images_${sceneId}`] ?? mappedImage} onChange={(e) => setManualMap((prev) => ({ ...prev, [`images_${sceneId}`]: e.target.value }))}>
                <option value="">이미지 선택</option>
                {(assets.assets?.images ?? []).map((file) => <option key={file} value={file}>{file}</option>)}
              </select>
              <button type="button" className="toolbar-btn" onClick={() => void handleRemap("images", sceneId)}>이미지 재배정</button>

              <select className={!mappedAudio ? "map-select missing" : "map-select"} value={manualMap[`audio_${sceneId}`] ?? mappedAudio} onChange={(e) => setManualMap((prev) => ({ ...prev, [`audio_${sceneId}`]: e.target.value }))}>
                <option value="">오디오 선택</option>
                {(assets.assets?.audio ?? []).map((file) => <option key={file} value={file}>{file}</option>)}
              </select>
              <button type="button" className="toolbar-btn" onClick={() => void handleRemap("audio", sceneId)}>오디오 재배정</button>
            </div>
          );
        })}
      </div>

      <div className="panel-actions">
        <button type="button" className="toolbar-btn" onClick={handleValidate}>렌더 전 검증</button>
        <button type="button" className="toolbar-btn" onClick={handleRender} disabled={!projectId}>렌더 실행</button>
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

      <RenderJobStatusPanel renderJob={renderJob} resultUrl={resultUrl} thumbUrl={thumbUrl} logUrl={logUrl} />
    </section>
  );
}

export default ProjectAssetsPanel;
