#!/usr/bin/env node
// build-state.json 무결성 검증. 이 파일이 깨지면 어디까지 했는지를 믿을 수 없으므로 게이트에서 막는다.
// 검사: (1) 파싱 가능 (2) IN_PROGRESS ≤ 1 (3) checklist id 유일 (4) status 값이 허용 enum
//      (5) 리뷰 미종결 방지 — COMPLETED 인 화면 항목은 harness/review/<id>.json 이 있고
//          리뷰어 2종이 각 1회 돌았으며(`reviewed.spec`·`reviewed.ds`) 모든 finding 에 처리 결과가 붙어 있어야 한다.
//          USS 리뷰 대상 = step-3 ~ step-6. Step 5 는 하위단계라 `step-5-1:` 형태도 잡아야 한다(→ SCREEN_ITEM).
//      (6) deferred 미처리 차단 — target_item 이 COMPLETED 인데 아직 열려 있는 deferred 가 있으면 손상.
// 옛 스키마(spec/ds === 'PASS')는 그대로 통과시킨다 — 지난 기록을 소급해서 게이트를 막지 않는다.
//
// ⚠️ 2026-08-10 이전에는 `spec==='PASS' && ds==='PASS'` 를 요구했다. 그게 "PASS 받을 때까지 재리뷰"를
//    강제해 항목 6개에 리뷰어 실행 29회가 들었고, 지적 37건 중 17건은 결국 deferred 로 밀렸다.
//    지금은 **한 번 보고 → 지적을 종결시킨다**. 종결에는 fixed 말고 deferred·dropped·question 도 포함된다.
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
// 지적의 종결 상태. fixed 만 종결이 아니다 — 넘기거나 버리거나 사람에게 묻는 것도 종결이다.
const RESOLUTIONS = new Set(['fixed', 'deferred', 'dropped', 'question']);

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

  // (5) 리뷰 미종결 방지: COMPLETED 인 화면 항목(step-3~6)은 종결된 리뷰 JSON 필요. IN_PROGRESS 등은 제외.
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

    // 옛 스키마는 그대로 인정한다.
    if (r.spec === 'PASS' && r.ds === 'PASS') continue;

    const reviewed = r.reviewed || {};
    const missing = ['spec', 'ds'].filter((k) => !reviewed[k]);
    if (missing.length) {
      errors.push(`리뷰 미실행: ${c.id} — reviewed.${missing.join('·')} 가 없다(리뷰어 2종은 각 1회 돌아야 한다)`);
    }

    if (!Array.isArray(r.findings)) {
      errors.push(`리뷰 형식: ${c.id} — findings 배열이 없다(지적이 없었으면 [])`);
      continue;
    }
    const unresolved = r.findings.filter((f) => !RESOLUTIONS.has(f && f.resolution));
    if (unresolved.length) {
      errors.push(
        `리뷰 미종결: ${c.id} — 처리 결과가 없는 지적 ${unresolved.length}건 ` +
          `(허용: ${[...RESOLUTIONS].join('·')})`,
      );
    }
    // deferred 로 종결한 지적은 build-state 로 옮겨져야 아무도 안 읽는 상태를 피한다.
    const carried = r.findings.filter((f) => f && f.resolution === 'deferred').length;
    const inState = (Array.isArray(s.deferred) ? s.deferred : []).filter((d) => d.from === c.id).length;
    if (carried > inState) {
      errors.push(`deferred 누락: ${c.id} — 리뷰에서 ${carried}건을 넘겼는데 build-state.deferred 에는 ${inState}건뿐이다`);
    }
  }

  // (6) deferred 미처리 차단. 넘긴 항목을 아무도 안 읽는 상태를 막는다.
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
