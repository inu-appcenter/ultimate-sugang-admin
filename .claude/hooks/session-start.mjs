#!/usr/bin/env node
// SessionStart 훅(#10): 세션 시작/재개 시 build-state 의 "가장 이른 비완료 항목"을 컨텍스트에 주입해
// Phase 0 복구를 결정적으로 만든다. 무결성 위반(IN_PROGRESS 2개+ 등)도 즉시 경고. 항상 exit 0(비차단).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSpecPresence } from './checks/spec-presence.mjs';

const here = dirname(fileURLToPath(import.meta.url));      // .claude/hooks
const statePath = join(here, '..', 'build-state.json');   // .claude/build-state.json
const out = (msg) => process.stdout.write(msg + '\n');

// 설치 정합성: spec/ 파일명이 참조와 어긋나면(예: 버전 접미사 미리네임) 즉시 경고. 비차단.
const specWarns = checkSpecPresence(join(here, '..', 'spec'));
if (specWarns.length) {
  out('[하네스 설치 경고] spec/ 파일명이 참조와 불일치 — Read 깨짐 위험:');
  for (const w of specWarns) out('  - ' + w);
}

if (!existsSync(statePath)) process.exit(0);

let s;
try { s = JSON.parse(readFileSync(statePath, 'utf8')); }
catch { out('[하네스] build-state.json 파싱 불가 — Phase 0 복구에서 사용자에게 보고(🙋🏻).'); process.exit(0); }

const checklist = Array.isArray(s.checklist) ? s.checklist : [];
const inprog = checklist.filter(c => c.status === 'IN_PROGRESS');
const resume = checklist.find(c => c.status === 'TODO' || c.status === 'IN_PROGRESS');
const done = checklist.filter(c => c.status === 'COMPLETED' || c.status === 'SKIPPED').length;

const lines = ['[하네스 복구 신호] 지금 할 일은 build-state.json 의 checklist 가 정한다.'];
if (inprog.length > 1) {
  lines.push(`⚠️ IN_PROGRESS 가 ${inprog.length}개 — 상태 손상. 진행 금지, 사용자에게 보고(🙋🏻).`);
}
if (resume) {
  lines.push(`재개 항목: ${resume.id} (status=${resume.status}). 진척: ${done}/${checklist.length} 완료.`);
  lines.push('→ build-orchestrator 스킬로 Phase 0 복구부터 시작.');
} else {
  lines.push('모든 checklist 항목 완료/스킵 — 남은 재개 항목 없음.');
}

// 넘긴 지적을 읽는 사람을 만든다. 리뷰 파일에만 두면 다음 세션이 같은 항목을 또 옮겨 적기만 한다.
const deferred = (Array.isArray(s.deferred) ? s.deferred : []).filter(
  (d) => d.status !== 'resolved' && d.status !== 'dropped',
);
if (deferred.length) {
  const mine = resume ? deferred.filter((d) => d.target_item === resume.id) : [];
  const asks = deferred.filter((d) => d.needs === 'user');
  lines.push(`\n[넘긴 지적] 열린 항목 ${deferred.length}건 — 전문은 build-state.json 의 deferred.`);
  if (mine.length) {
    lines.push(`  · 재개 항목(${resume.id})을 겨냥한 것 ${mine.length}건 — 이 단계에서 처리한다:`);
    for (const d of mine) lines.push(`      - ${String(d.text).slice(0, 70)}…`);
  }
  if (asks.length) {
    lines.push(`  · 사용자 결정 대기 ${asks.length}건 — 코드 쓰기 전에 한 번에 묻는다(🙋🏻).`);
  }
}

// 원인 추적을 3회 넘긴 항목이 있으면 되짚지 말라고 알린다.
const stalled = Object.entries(s.probes || {}).filter(([, n]) => Number(n) >= 3);
if (stalled.length) {
  lines.push(`\n[탐색 상한 초과] ${stalled.map(([k, n]) => `${k}(${n}회)`).join(' · ')} — notes 의 unresolved 를 먼저 읽는다. 같은 가설을 다시 밟지 않는다.`);
}

out(lines.join('\n'));
process.exit(0);
