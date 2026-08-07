#!/usr/bin/env bash
# 소프트 게이트: eslint. 인자로 파일을 주면 그 파일만, 없으면 src 전체.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1
if [ "$#" -gt 0 ]; then npx eslint "$@"; else npx eslint src --max-warnings=0; fi
