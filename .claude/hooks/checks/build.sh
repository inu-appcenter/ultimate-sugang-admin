#!/usr/bin/env bash
# 차단 검사: 운영 빌드가 성공하는지 본다.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1
npm run build
