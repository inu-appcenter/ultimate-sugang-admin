#!/usr/bin/env bash
# 게이트 묶음. 표준출력: 'OK' 또는 'FAIL\n{사유}'. exit 0/1.
# 모드:
#   (인자 없음)    fast  : validate-state + typecheck + token-lint + uss-contract-lint  — Stop 훅·매 턴(빠름)
#   --full         full  : fast + verify(동작 검증 ~100초) + build(vite)  — 커밋/리뷰패킷 전
#   --with-smoke   qa    : full + Playwright 스모크                   — QA(Step 7)
# verify 를 fast 에 넣지 않는 이유는 비용뿐이다(jsdom 7프로세스). 작업 중에는 `npm run verify -- step-5` 로 좁혀 돌린다.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
mode="${1:-fast}"
fails=()
run() { local name="$1"; shift; if ! "$@" >"/tmp/gate.$name.log" 2>&1; then fails+=("$name"); fi; }

run validate-state     node "$HERE/validate-state.mjs"
run typecheck          bash "$HERE/typecheck.sh"
run token-lint         node "$HERE/token-lint.mjs"
run uss-contract-lint  node "$HERE/uss-contract-lint.mjs"
if [ "$mode" = "--full" ] || [ "$mode" = "--with-smoke" ]; then
  run verify npm run --silent verify
  run build bash "$HERE/build.sh"
fi
if [ "$mode" = "--with-smoke" ]; then
  run smoke bash "$HERE/smoke.sh"
fi

if [ ${#fails[@]} -eq 0 ]; then
  echo "OK"; exit 0
else
  printf 'FAIL\n'
  for f in "${fails[@]}"; do echo "- $f (로그: /tmp/gate.$f.log)"; done
  exit 1
fi
