#!/usr/bin/env node
// build-state.json 무결성 검증. 이 파일이 깨지면 어디까지 했는지를 믿을 수 없으므로 게이트에서 막는다.
// 검사: (1) 파싱 가능 (2) IN_PROGRESS ≤ 1 (3) checklist id 유일 (4) status 값이 허용 enum
//      (5) 리뷰어 미실행 방지 — COMPLETED 인 화면 항목은 harness/review/<id>.json 이 있고 spec==='PASS' && ds==='PASS' 여야 한다.
//          USS 리뷰 대상 = step-3 ~ step-6. Step 5 는 하위단계라 `step-5-1:` 형태도 잡아야 한다(→ SCREEN_ITEM).
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
  }
}

if (errors.length === 0) { console.log('validate-state OK'); process.exit(0); }
console.error('build-state.json 무결성 FAIL:');
for (const e of errors) console.error('  - ' + e);
process.exit(1);
