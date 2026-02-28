import json
import time
from app.render_engine import fail_render_job, run_render_job
from app.render_job_store import create_render_job, read_render_job_by_id
from app.schemas import ProjectCreateRequest
from app.storage import create_project, ensure_project_dirs, write_asset_map


def run_cmd(cmd: str) -> None:
    import subprocess

    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"명령 실패: {cmd}\n{result.stderr}")


def create_sample_assets(project_id: str) -> None:
    base = ensure_project_dirs(project_id)
    run_cmd(f"ffmpeg -y -f lavfi -i color=c=#1D3557:s=1080x1920:d=0.1 -frames:v 1 {base / 'images' / 's1.png'}")
    run_cmd(f"ffmpeg -y -f lavfi -i color=c=#E63946:s=1080x1920:d=0.1 -frames:v 1 {base / 'images' / 's2.png'}")
    run_cmd(f"ffmpeg -y -f lavfi -i sine=frequency=520:duration=2.8 -c:a pcm_s16le {base / 'audio' / 's1.wav'}")
    run_cmd(f"ffmpeg -y -f lavfi -i sine=frequency=680:duration=2.8 -c:a pcm_s16le {base / 'audio' / 's2.wav'}")
    run_cmd(f"ffmpeg -y -f lavfi -i sine=frequency=180:duration=8 -c:a pcm_s16le {base / 'bgm' / 'bgm.wav'}")

    write_asset_map(
        project_id,
        {
            "images": {"scene_1": "s1.png", "scene_2": "s2.png"},
            "audio": {"scene_1": "s1.wav", "scene_2": "s2.wav"},
            "bgm": ["bgm.wav"],
            "sfx": [],
        },
    )


def main() -> None:
    sample_render = {
        "duration_sec": 5.6,
        "global_transition": "cross dissolve",
        "scenes": [
            {
                "scene_id": "scene_1",
                "duration_sec": 2.8,
                "camera_motion": {"type": "zoom-in", "strength": "약"},
                "transition": {"type": "cross dissolve"},
                "subtitle_lines": [
                    {"start_sec": 0.1, "end_sec": 1.6, "text": "첫 번째 장면 자막입니다."},
                    {"start_sec": 1.7, "end_sec": 2.6, "text": "줌인 모션 테스트"},
                ],
            },
            {
                "scene_id": "scene_2",
                "duration_sec": 2.8,
                "camera_motion": {"type": "pan-right", "strength": "중"},
                "transition": {"type": "fade"},
                "subtitle_lines": [
                    {"start_sec": 0.2, "end_sec": 1.8, "text": "두 번째 장면 자막"},
                    {"start_sec": 1.9, "end_sec": 2.7, "text": "팬 모션 테스트"},
                ],
            },
        ],
    }

    project = create_project(ProjectCreateRequest(title="render-test", render_json=sample_render))
    create_sample_assets(project.project_id)
    job = create_render_job(project.project_id)

    start = time.time()
    try:
        run_render_job(project.project_id, job.job_id, sample_render)
    except Exception as error:  # noqa: BLE001
        fail_render_job(project.project_id, job.job_id, str(error))
        raise

    completed = read_render_job_by_id(job.job_id)
    elapsed = round(time.time() - start, 2)

    print(json.dumps(completed.model_dump(mode="json"), indent=2, ensure_ascii=False))
    print(f"elapsed_sec={elapsed}")


if __name__ == "__main__":
    main()
