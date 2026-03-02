#!/usr/bin/env bash
set -e

echo "=== ffmpeg + 한국어 폰트 설치 ==="
# Render.com은 Debian 기반이라 apt 사용 가능
apt-get update -qq
apt-get install -y --no-install-recommends ffmpeg fonts-nanum fonts-noto-cjk-full
fc-cache -fv

echo "=== ffmpeg 버전 확인 ==="
ffmpeg -version | head -1

echo "=== Python 패키지 설치 ==="
pip install -r requirements.txt
