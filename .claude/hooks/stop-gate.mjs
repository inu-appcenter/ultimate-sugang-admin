#!/usr/bin/env node
// Stop 훅: 완료 선언 전 게이트 강제. 매 턴 종료마다 발화하므로 여기서는 fast 게이트만 돌린다
// (validate-state + typecheck + token-lint). vite build 는 커밋/리뷰패킷 전 오케스트레이터가
// `gate-runner.sh --full` 로 명시 실행한다 — 매 턴 풀빌드 비용 제거(#9).
// 게이트 red → 정지 차단(exit 2)으로 자가수정 유도. 단 자가수정 3회 초과면 데드락 방지로 정지 허용(exit 0).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));  // .claude/hooks
const root = process.cwd();

// 프로젝트 스캐폴드 이전(=package.json 없음)에는 게이트 대상이 없으므로 통과.
// (Step 1 이후 package.json 이 생기면 차단이 자동으로 켜진다.)
if (!existsSync(join(root, 'package.json'))) process.exit(0);

const g = spawnSync('bash', [join(here, 'checks', 'gate-runner.sh')], { encoding: 'utf8' });
if (g.status === 0) process.exit(0); // green → 정지 허용

// red: 에스컬레이션 여부 판단(판단 자체는 오케스트레이터가 retry/manual_review 에 기록, 훅은 읽기만)
const statePath = join(here, '..', 'build-state.json');
let escalated = false;
if (existsSync(statePath)) {
  try {
    const s = JSON.parse(readFileSync(statePath, 'utf8'));
    const inprog = (s.checklist || []).find(c => c.status === 'IN_PROGRESS');
    const retries = inprog ? (s.retry?.[inprog.id] || 0) : 0;
    const flagged = inprog && (s.manual_review || []).some(m => (m.id || m) === inprog.id);
    escalated = retries >= 3 || flagged;
  } catch { /* 상태 손상 시 보수적으로 차단 */ }
}
if (escalated) {
  process.stderr.write('게이트 red 이나 자가수정 한도 초과(또는 manual-review 태그) — 사람 검수를 위해 정지 허용.\n' + (g.stdout || ''));
  process.exit(0);
}
process.stderr.write('게이트 red — 완료 선언 차단. 사유:\n' + (g.stdout || '') + '\n수정 후 다시 시도(자가수정 카운터 +1). 한도 3회.\n');
process.exit(2);
