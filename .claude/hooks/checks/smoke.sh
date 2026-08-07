#!/usr/bin/env bash
# QA 게이트: 최고위험 3흐름 Playwright 스모크. 미설치(QA 이전)면 정상 스킵.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1
if ! npx --no-install playwright --version >/dev/null 2>&1; then
  echo "playwright 미설치 — 스모크 스킵 (QA Step 에서 설치)"; exit 0
fi
npx playwright test .claude/resource/smoke
