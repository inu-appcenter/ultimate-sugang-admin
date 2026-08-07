#!/usr/bin/env bash
# 차단 검사: 프로젝트 전체 타입체크. (tsc 는 프로젝트 단위로 도므로 파일별로 쪼개지 않는다)
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1
npx tsc --noEmit
