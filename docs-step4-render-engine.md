# Step 4 — FastAPI + ffmpeg 실제 렌더 엔진

## 1) 파이프라인 단계

1. `POST /api/projects/{project_id}/render` 호출 시 render job 생성 (`queued`).
2. 백그라운드 스레드에서 job을 `running`으로 변경하고 `render.log` 생성.
3. `render_json + asset_map` 사전 검증(누락 자산 즉시 실패).
4. 장면별로 아래를 수행:
   - 이미지 + 오디오 입력
   - 카메라 모션(hold/zoom/pan) 적용
   - 장면 자막(drawtext) 번인
   - 개별 장면 mp4 생성
5. 장면들을 전환(cut/fade/cross dissolve) 방식으로 병합.
6. BGM이 있으면 음성 + bgm 볼륨 믹싱.
7. 최종 `output.mp4` 생성 후 `thumbnail.jpg` 추출.
8. job 상태를 `done`(성공) 또는 `failed`(실패)로 저장.

## 2) ffmpeg 처리 방식

- 장면 렌더: `-loop 1` 이미지 입력 + 장면 오디오 입력 + `zoompan/drawtext` 필터 적용.
- 전환:
  - `cut`: concat
  - `fade`, `cross dissolve`: `xfade` + `acrossfade`
- BGM 믹싱: `amix` 사용 (`TTS 1.0`, `BGM 0.35` 가중치)
- 출력 규격: `1080x1920`, `30fps`, `mp4(h264+aac)`

## 3) 자막 방식

- 기본 구현은 `drawtext` 번인 방식.
- 스타일: 흰색 + 검은 외곽선.
- 한글 폰트는 `HIDDENTUBE_SUBTITLE_FONT` 환경변수 우선.
- 환경변수가 없으면 Noto/Nanum/DejaVu 순서로 자동 탐색.

## 4) API

- `POST /api/projects/{project_id}/render`
- `GET /api/render-jobs/{job_id}`
- `GET /api/render-jobs/{job_id}/log`
- `GET /api/render-jobs/{job_id}/result`
- `GET /api/render-jobs/{job_id}/thumbnail`

## 5) 실패 시 디버깅 포인트

1. `GET /api/render-jobs/{job_id}` 의 `error_message` 확인
2. `GET /api/render-jobs/{job_id}/log` 로 ffmpeg stderr 확인
3. 자산 누락/파일 경로/폰트 경로 확인
4. ffmpeg 설치 확인: `ffmpeg -version`

## 6) 실행 방법

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 7) 샘플 렌더 검증

```bash
cd backend
PYTHONPATH=. python3 scripts/test_render_pipeline.py
```

성공 시 job json이 출력되며 `status=done`, `output_path`, `thumbnail_path`를 확인할 수 있습니다.
