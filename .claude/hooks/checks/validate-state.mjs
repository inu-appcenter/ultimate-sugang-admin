#!/usr/bin/env node
// build-state.json 무결성 검증. 이 파일이 깨지면 어디까지 했는지를 믿을 수 없으므로 게이트에서 막는다.
// 검사: (1) 파싱 가능 (2) IN_PROGRESS ≤ 1 (3) checklist id 유일 (4) status 값이 허용 enum
//      (5) 리뷰어 미실행 방지 — COMPLETED 인 화면 항목은 harness/review/<id>.json 이 있고 spec==='PASS' && ds==='PASS' 여야 한다.
//          USS 리뷰 대상 = step-3 ~ step-6. Step 5 는 하위단계라 `step-5-1:` 형태도 잡아야 한다(→ SCREEN_ITEM).
//      (6) 리뷰 라운드 상한 — rounds 가 2 를 넘으면 남은 지적을 넘긴 기록(deferred/open_questions)이 있어야 한다.
//      (7) deferred 미처리 차단 — target_item 이 COMPLETED 인데 아직 열려 있는 deferred 가 있으면 손상.
// 새 규칙(6)(7)은 필드가 없으면 통과시킨다 — 옛 기록을 소급해서 게이트를 막지 않는다.
// exit 0 = OK(또는 파일 부재=검증 대상 없음), exit 1 = 손상.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));        // .claude/hooks/checks
const statePath = join(here, '..', '..', 'build-state.json'); // .claude/build-state.json
const reviewDir = join(here, '..', '..', '..', 'harness', 'review'); // <repo>/harness/review
const ALLOWED = new Set(['TODO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'manual-review']);
// 리뷰 필수 항목: step-3:ADMIN_LOGIN · step-4:SYNC_MAIN_shell · step-5-1~5-4:* · step-6:expand_detail
const SCREEN_ITEM = /^step-[3-6](-\d+)?:/;
// 리뷰어 1종당 라운드 상한. 넘기려면 남은 지적을 deferred/open_questions 로 넘긴 기록이 필요하다.
const ROUND_LIMIT = 2;

if (!existsSync(statePath)) { console.log('validate-state: build-state.json 부재 — 스킵'); process.exit(0); }

let s;
try { s = JSON.parse(readFileSync(statePath, 'utf8')); }
catch (e) { console.error('build-state.json 파싱 불가: ' + e.message); process.exit(1); }

const errors = [];
const checklist = Array.isArray(s.checklist) ? s.checklist : null;
if (!checklist) errors.push('checklist 배열이 없음');
else {
  const inprog = checklist.filter(c => c.status === 'IN_PROGRESS');
  if (inprog.length > 1) errors.push(`IN_PROGRESS 가 ${inprog.length}개 — 정확히 1개만 허용(상태 손상)`);
  const ids = checklist.map(c => c.id);
  const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dups.length) errors.push('중복 checklist id: ' + [...new Set(dups)].join(', '));
  for (const c of checklist) {
    if (!c.id) errors.push('id 없는 항목 존재');
    if (!ALLOWED.has(c.status)) errors.push(`허용되지 않은 status "${c.status}" (id=${c.id})`);
  }

  // (5) 리뷰어 미실행 방지: COMPLETED 인 화면 항목(step-3~6)은 통과 리뷰 JSON 필요. IN_PROGRESS 등은 제외.
  for (const c of checklist) {
    if (!SCREEN_ITEM.test(c.id || '') || c.status !== 'COMPLETED') continue;
    const reviewPath = join(reviewDir, `${c.id}.json`);
    if (!existsSync(reviewPath)) {
      errors.push(`리뷰 미기록: ${c.id} 가 COMPLETED 인데 harness/review/${c.id}.json 없음`);
      continue;
    }
    let r;
    try { r = JSON.parse(readFileSync(reviewPath, 'utf8')); }
    catch (e) { errors.push(`리뷰 JSON 파싱 불가: harness/review/${c.id}.json — ${e.message}`); continue; }
    if (r.spec !== 'PASS' || r.ds !== 'PASS') {
      errors.push(`리뷰 미통과: ${c.id} (spec=${r.spec ?? '?'}, ds=${r.ds ?? '?'}) — spec·ds 모두 PASS 필요`);
    }

    // (6) 라운드 상한. 3라운드째로 가려면 "남은 지적을 넘겼다"는 기록이 있어야 한다.
    //     리뷰는 PASS 받을 때까지 도는 구조라 새 라운드가 새 지적을 부른다 — 비용이 무한히 열려 있었다.
    if (r.rounds) {
      const over = ['spec', 'ds'].filter((k) => Number(r.rounds[k] || 0) > ROUND_LIMIT);
      const carried = (r.deferred || []).length + (r.open_questions || []).length;
      if (over.length && carried === 0) {
        errors.push(
          `리뷰 라운드 초과: ${c.id} (${over.map((k) => `${k}=${r.rounds[k]}`).join(', ')} > ${ROUND_LIMIT}) — ` +
            `남은 지적을 deferred 또는 open_questions 로 넘긴 기록이 없다`,
        );
      }
    }
  }

  // (7) deferred 미처리 차단. 넘긴 항목을 아무도 안 읽는 상태를 막는다.
  const doneIds = new Set(checklist.filter((c) => c.status === 'COMPLETED').map((c) => c.id));
  for (const d of Array.isArray(s.deferred) ? s.deferred : []) {
    if (d.status === 'resolved' || d.status === 'dropped') continue;
    if (d.target_item && doneIds.has(d.target_item)) {
      errors.push(
        `deferred 미처리: "${String(d.text || '').slice(0, 40)}…" 의 target_item(${d.target_item}) 이 COMPLETED 인데 아직 열려 있다`,
      );
    }
  }
}

if (errors.length === 0) { console.log('validate-state OK'); process.exit(0); }
console.error('build-state.json 무결성 FAIL:');
for (const e of errors) console.error('  - ' + e);
process.exit(1);
