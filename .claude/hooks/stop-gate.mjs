#!/usr/bin/env node
// Stop 훅: 완료 선언 전 게이트 강제. 매 턴 종료마다 발화하므로 여기서는 fast 게이트만 돌린다
// (validate-state + typecheck + token-lint + uss-contract-lint). vite build 와 verify 는
// 커밋/리뷰패킷 전 오케스트레이터가 `gate-runner.sh --full` 로 명시 실행한다.
//
// 게이트 red → 정지 차단(exit 2) + **retry 카운터 자동 +1**. 3회 초과면 데드락 방지로 정지 허용(exit 0).
// 카운터를 훅이 올리는 이유: 자기보고에 맡겼더니 한 번도 올라가지 않았다(log 의 retry 가 전부 0인데
// 같은 항목 본문에는 "1라운드 FAIL 4건"이 적혀 있었다). 제동당하는 쪽이 카운터를 쥐면 제동이 안 걸린다.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));  // .claude/hooks
const root = process.cwd();

// 프로젝트 스캐폴드 이전(=package.json 없음)에는 게이트 대상이 없으므로 통과.
// (Step 1 이후 package.json 이 생기면 차단이 자동으로 켜진다.)
if (!existsSync(join(root, 'package.json'))) process.exit(0);

const g = spawnSync('bash', [join(here, 'checks', 'gate-runner.sh')], { encoding: 'utf8' });
if (g.status === 0) process.exit(0); // green → 정지 허용

const statePath = join(here, '..', 'build-state.json');
const LIMIT = 3;

/**
 * retry 객체만 정규식으로 갈아끼운다. JSON.stringify 로 통째 재작성하면
 * build-state.json 의 손정렬(checklist 열 맞춤)이 전부 무너져 diff 를 읽을 수 없게 된다.
 */
function bumpRetry(id) {
  try {
    const raw = readFileSync(statePath, 'utf8');
    const m = raw.match(/"retry"\s*:\s*\{[^}]*\}/);
    if (!m) return null;
    const current = JSON.parse(m[0].replace(/^"retry"\s*:\s*/, ''));
    const next = { ...current, [id]: (current[id] || 0) + 1 };
    // 보기 좋으라고 콤마·콜론에 공백을 넣지 않는다. 항목 ID 자체가 `step-5-4:polling` 처럼
    // 콜론을 품고 있어서 키가 망가지고, 다음 실행에서 새 키가 생겨 카운터가 한도에 영영 못 닿는다.
    writeFileSync(statePath, raw.replace(m[0], `"retry": ${JSON.stringify(next)}`), 'utf8');
    return next[id];
  } catch {
    return null; // 상태 손상 시 카운터는 포기하고 차단만 한다
  }
}

let inprogId = null;
let escalated = false;
if (existsSync(statePath)) {
  try {
    const s = JSON.parse(readFileSync(statePath, 'utf8'));
    const inprog = (s.checklist || []).find(c => c.status === 'IN_PROGRESS');
    inprogId = inprog ? inprog.id : null;
    const retries = inprogId ? (s.retry?.[inprogId] || 0) : 0;
    const flagged = inprogId && (s.manual_review || []).some(m => (m.id || m) === inprogId);
    escalated = retries >= LIMIT || flagged;
  } catch { /* 상태 손상 시 보수적으로 차단 */ }
}
if (escalated) {
  process.stderr.write('게이트 red 이나 자가수정 한도 초과(또는 manual-review 태그) — 사람 검수를 위해 정지 허용.\n' + (g.stdout || ''));
  process.exit(0);
}

const count = inprogId ? bumpRetry(inprogId) : null;
const tail = count === null
  ? '\n수정 후 다시 시도. 한도 3회.\n'
  : `\n자가수정 ${count}/${LIMIT} 회째. 한도를 넘으면 manual_review 로 넘기고 사람에게 보고한다.\n`;
process.stderr.write('게이트 red — 완료 선언 차단. 사유:\n' + (g.stdout || '') + tail);
process.exit(2);
