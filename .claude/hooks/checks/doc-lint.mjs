#!/usr/bin/env node
/**
 * doc-lint.mjs — 하네스 문서의 용어·표기 표준을 고정한다.
 *
 * 이 스크립트가 있는 이유: "이 단어 대신 저 단어를 쓴다"는 판단이 필요 없는 규칙이다.
 * 문서로만 적어두면 다음에 문서를 고칠 때 다시 흐트러지므로 기계가 잡게 한다.
 *
 * 사용: node .claude/hooks/checks/doc-lint.mjs [--fix]
 * 출력: `doc-lint OK` (exit 0) 또는 위반 목록 (exit 1)
 *
 * 게이트에는 배선하지 않았다. 문서 표기는 빌드를 막을 사안이 아니고,
 * 문서를 고칠 때 손으로 돌리는 편이 맞다.
 *
 * 예외: 줄 끝에 `<!-- doc-lint:allow -->` 를 붙이면 그 줄은 건너뛴다.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const claudeDir = join(here, '..', '..'); // .claude
const fix = process.argv.includes('--fix');

/**
 * 금지 표기 → 표준 표기.
 *
 * `fixable: true`  — 앞뒤 문맥과 무관하게 단어만 바꾸면 되는 것. `--fix` 가 자동 치환한다.
 * `fixable: false` — 단어만 바꾸면 오히려 더 어색해지는 것(예: "최종 권위를 갖는 영역").
 *                    문장을 다시 써야 하므로 보고만 하고 손대지 않는다.
 * `re`             — 탐지용 정규식. 한국어는 띄어쓰기로 단어가 갈리지 않아서, 금지어가 다른 낱말의
 *                    일부로 들어가는 경우(예: "일관성" 안의 "관성")를 여기서 걸러낸다.
 */
const TERMS = [
  // 표준 표기 — 단어 단위 치환으로 끝난다
  { bad: '데스크탑', good: '데스크톱', why: '표준 표기', fixable: true },
  { bad: '컨텐츠', good: '콘텐츠', why: '표준 표기', fixable: true },
  { bad: '다크모드', good: '다크 모드', why: '띄어쓰기 통일', fixable: true },
  { bad: '라이트모드', good: '라이트 모드', why: '띄어쓰기 통일', fixable: true },
  { bad: '하드블록', good: '차단', why: 'hard block 직역', fixable: true },
  { bad: '인테이크', good: '확인', why: 'intake 음차', fixable: true },

  // 영어 직역 — 문장을 다시 써야 한다
  { bad: '권위', good: '기준 / ~을 정한다', why: 'authority 직역. "X의 권위다" 는 한국어 문장이 아니다', fixable: false },
  // "일관성" 의 일부로 걸리지 않게 앞 글자를 본다.
  { bad: '관성', re: /(?<!일)관성/, good: '잔재 / 습관', why: 'inertia 직역. 문서 다른 곳에서 이미 "잔재"를 쓴다', fixable: false },
  { bad: '무상태', good: '검토만 하는 / 코드를 고치지 않는', why: 'stateless 직역. 사람 역할에 붙는 말이 아니다', fixable: false },
  { bad: '척추', good: '기준', why: 'spine 비유 직역', fixable: false },
  { bad: '휘발 산출물', good: '다시 만들 수 있는 파일', why: 'volatile artifact 직역', fixable: false },
  { bad: '단일비행', good: '동시 1건만', why: 'single-flight 직역', fixable: false },
];

// 문서뿐 아니라 훅·검사 스크립트도 본다. 사용자에게 보이는 문구(SessionStart 출력, 경고 메시지)가
// 여기 들어 있어서 .md 만 훑으면 표현이 따로 논다.
// 이 파일 자신은 제외한다 — 위 규칙 표에 금지어가 그대로 들어 있기 때문이다.
const SELF = fileURLToPath(import.meta.url);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(md|mjs|sh)$/.test(name) && p !== SELF) out.push(p);
  }
  return out;
}

const violations = [];
let fixedCount = 0;

for (const file of walk(claudeDir)) {
  const rel = relative(join(claudeDir, '..'), file);
  const original = readFileSync(file, 'utf8');
  const lines = original.split('\n');
  let inFence = false;
  let changed = false;

  const nextLines = lines.map((line, i) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line; // 코드블록·ASCII 와이어프레임은 건드리지 않는다
    if (line.includes('doc-lint:allow')) return line;

    let out = line;
    for (const { bad, re, good, why, fixable } of TERMS) {
      // 인라인 코드(`...`) 안은 식별자일 수 있으니 제외하고 검사한다.
      const stripped = out.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length));
      if (re ? !re.test(stripped) : !stripped.includes(bad)) continue;
      const tag = fixable ? '' : ' [문장 수정 필요]';
      violations.push(`${rel}:${i + 1}  "${bad}" → "${good}"${tag}  (${why})`);
      if (fix && fixable) {
        // 인라인 코드 밖에서만 치환한다.
        out = out.replace(/(`[^`]*`)|([^`]+)/g, (m, code, text) =>
          code ? code : text.split(bad).join(good),
        );
        changed = true;
      }
    }
    return out;
  });

  if (fix && changed) {
    writeFileSync(file, nextLines.join('\n'));
    fixedCount += 1;
  }
}

if (violations.length === 0) {
  console.log('doc-lint OK');
  process.exit(0);
}
if (fix) {
  const remaining = violations.filter((v) => v.includes('[문장 수정 필요]'));
  console.log(`doc-lint --fix: ${fixedCount}개 파일 자동 치환. 남은 ${remaining.length}건은 문장을 다시 써야 한다.`);
  for (const v of remaining) console.log('  ' + v);
  process.exit(remaining.length ? 1 : 0);
}
console.error(`doc-lint FAIL (${violations.length})`);
for (const v of violations) console.error('  ' + v);
console.error('\n`node .claude/hooks/checks/doc-lint.mjs --fix` 로 일괄 치환할 수 있다.');
console.error('문맥상 그 단어라야 한다면 줄 끝에 `<!-- doc-lint:allow -->` 를 붙인다.');
process.exit(1);
