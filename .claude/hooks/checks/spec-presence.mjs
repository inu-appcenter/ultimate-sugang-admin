#!/usr/bin/env node
/**
 * spec-presence.mjs — SoT 문서 정합성 검증 (USS)
 *
 * 두 가지로 쓰인다:
 *   1) `checkSpecPresence(specDir)` — SessionStart 훅이 import. 경고 문자열 배열 반환. **비차단**.
 *   2) `node .claude/hooks/checks/spec-presence.mjs` — 직접 실행. `OK` 또는 `FAIL\n{사유}`. 필수 누락·
 *      Gravit 잔재 발견 시 exit 1.
 *
 * ⚠️ export 이름·시그니처는 `hooks/session-start.mjs` 와의 계약이다. 바꾸면 SessionStart 훅이 깨진다.
 */
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 에이전트가 명시 경로로 Read 하는 정확한 파일명(= 참조와 1:1). 없으면 FAIL. */
const REQUIRED = [
  '00_INDEX.md',
  '01_uss_admin_wireframe_spec.md',
  '03_uss_admin_api_spec.md',
  '04_uss_admin_frontend_spec.md',
  'DS-00_uss_overview.md',
  'DS-01_uss_design_system.md',
];

/** 있어도 되지만 판단 근거로는 쓰지 않는 문서 (없으면 경고만). */
const OPTIONAL = ['DS-03_interactions.md'];

/** 존재하면 안 되는 Gravit 잔재 — USS 문서와 충돌해 혼선을 부른다. 발견 시 FAIL. */
const FORBIDDEN = [
  '01_gravit_admin_wireframe_spec.md',
  '03_gravit_admin_api_spec.md',
  '04_gravit_admin_frontend_spec.md',
  'DS-00_overview.md',
  'DS-01_design_system.md',
  'DS-02_screens.md',
];

/** Gravit 전용이나 USS 검증 대상은 아님 — 경고만(삭제 권장). */
const DISCOURAGED = ['DS-04_prompt_templates.md'];

const known = new Set([...REQUIRED, ...OPTIONAL, ...FORBIDDEN, ...DISCOURAGED]);

/**
 * specDir 를 감사해 { problems, warnings } 를 반환.
 * problems = 진행 불가(필수 누락 · Gravit 잔재). warnings = 알림만.
 */
export function auditSpec(specDir) {
  const problems = [];
  const warnings = [];

  if (!existsSync(specDir)) {
    return { problems: [`${specDir} 디렉토리가 없습니다.`], warnings };
  }
  const present = readdirSync(specDir);

  for (const name of REQUIRED) {
    if (present.includes(name)) continue;
    // 버전 접미사 등으로 이름만 어긋난 경우를 짚어준다(예: 03_uss_admin_api_spec_v1_1.md).
    const m = name.match(/^(\d{2}|DS-\d{2})/); // 안정적 식별 prefix(03 / DS-01 ...)
    const prefix = m ? m[1] : name.split('_')[0];
    const candidate = present.find(
      (f) => f.startsWith(prefix) && f.endsWith('.md') && f !== name && !FORBIDDEN.includes(f),
    );
    problems.push(
      candidate
        ? `spec/${candidate} 가 있으나 참조명과 다름 → spec/${name} 로 리네임 필요(에이전트가 이 이름으로 Read).`
        : `필수 문서 누락: spec/${name}`,
    );
  }

  for (const name of FORBIDDEN) {
    if (present.includes(name)) {
      problems.push(`Gravit 잔재 문서 발견: spec/${name} — 삭제 필요 (USS 문서와 충돌).`);
    }
  }

  for (const name of OPTIONAL) {
    if (!present.includes(name)) warnings.push(`선택 문서 없음: spec/${name}`);
  }
  for (const name of DISCOURAGED) {
    if (present.includes(name)) warnings.push(`Gravit 전용 문서: spec/${name} — 판단 근거가 아니다. 삭제 권장.`);
  }
  for (const f of present) {
    if (f.endsWith('.md') && !known.has(f)) warnings.push(`알 수 없는 문서: spec/${f}`);
  }

  return { problems, warnings };
}

/**
 * SessionStart 훅 계약: 경고 문자열 배열을 반환(빈 배열 = 정상). **절대 throw·exit 하지 않는다.**
 * problems 도 여기서는 경고로 합쳐 내보낸다 — 차단은 게이트(직접 실행)의 몫.
 */
export function checkSpecPresence(specDir) {
  const { problems, warnings } = auditSpec(specDir);
  return [...problems, ...warnings];
}

// 직접 실행: 게이트 계약(`OK` 또는 `FAIL\n{사유}`). problems 있으면 exit 1.
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('spec-presence.mjs')) {
  const here = dirname(fileURLToPath(import.meta.url)); // .claude/hooks/checks
  const { problems, warnings } = auditSpec(join(here, '..', '..', 'spec'));
  if (warnings.length) console.error(warnings.map((w) => `[warn] ${w}`).join('\n'));
  if (problems.length) {
    console.log(`FAIL\n${problems.join('\n')}`);
    process.exit(1);
  }
  console.log('OK');
  process.exit(0);
}
