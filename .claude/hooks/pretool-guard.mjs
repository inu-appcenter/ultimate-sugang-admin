#!/usr/bin/env node
// PreToolUse 훅: 위험/비가역 작업 차단. stdin 으로 hook JSON 수신.
// 차단: exit 2 + stderr 사유. 통과: exit 0.
//
// spec/ 은 기본이 읽기 전용이다. 구조를 손봐야 할 때만 build-state.json 의 `spec_edit` 를
// 사람이 true 로 열고, 끝나면 다시 닫는다. 완전히 풀어두지 않는 이유: "코드가 spec 과 다르면
// 코드를 고친다"는 규칙(source-of-truth)이 spec 을 고칠 수 있는 순간 무력해진다.
// 창을 닫아도 spec-map 의 해시가 남아, 창 밖에서 바뀐 내용은 fast 게이트가 잡는다.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const specEditOpen = (() => {
  try {
    const p = join(here, '..', 'build-state.json');
    return existsSync(p) && JSON.parse(readFileSync(p, 'utf8')).spec_edit === true;
  } catch { return false; }
})();

let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  let ev = {};
  try { ev = JSON.parse(raw || '{}'); } catch { process.exit(0); }
  const tool = ev.tool_name || '';
  const input = ev.tool_input || {};
  const block = (reason) => { process.stderr.write('차단: ' + reason + '\n'); process.exit(2); };

  if (tool === 'Bash') {
    const cmd = String(input.command || '');
    const danger = [
      [/rm\s+-rf?\s+(\/|~|\.\.)/, '광범위 삭제(rm -rf)'],
      [/git\s+push[^|;&]*(--force\b|--force-with-lease\b|\s-f\b|\s\+[A-Za-z])/, 'force push — 남의 커밋을 지운다. pull --rebase 후 다시 올린다'],
      [/git\s+push[^|;&]*\b(HEAD:)?main\b/, 'main 으로 직접 push 금지 — 작업 브랜치로 올린다'],
      [/gh\s+(release|pr\s+merge|repo\s+delete)/, 'gh 원격 반영(release/merge/delete) — 사람이 수행'],
      [/npm\s+publish|yarn\s+publish|pnpm\s+publish/, '패키지 publish — 사람이 수행'],
      [/(vercel|netlify|firebase|gh-pages)\s+deploy|--prod\b/, '배포 — 사람이 수행'],
      [/curl[^|]*\|\s*(sh|bash)/, '원격 스크립트 실행'],
    ];
    for (const [re, msg] of danger) if (re.test(cmd)) block(msg);
    if (!specEditOpen && /(>|>>)\s*[^\s|]*\.claude\/spec\//.test(cmd)) {
      block('spec/ 는 읽기전용 — 리다이렉트 쓰기 금지. 고쳐야 하면 build-state.json 의 spec_edit 를 사람이 연다');
    }
    // main 에서의 push 를 막는다. 작업 브랜치 push 는 통과 — commit-push 스킬이 쓴다. → rules/git-convention.md
    // 브랜치 조회는 push 명령일 때만 한다(매 Bash 호출마다 git 을 띄우지 않는다).
    if (/\bgit\s+push\b/.test(cmd)) {
      const br = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' });
      if ((br.stdout || '').trim() === 'main') {
        block('main 에서 push 하지 않는다 — 작업 브랜치(`{type}/{체크리스트항목}`)를 만들어 올린다');
      }
    }
  }
  if (/^(Write|Edit|MultiEdit)$/.test(tool)) {
    const fp = String(input.file_path || input.path || '').replace(/\\/g, '/');
    // spec/ 는 읽기전용 지식. 00_INDEX.md 는 네비게이션 메타라 상시 예외, 나머지는 spec_edit 창에서만.
    if (/\.claude\/spec\//.test(fp) && !/\.claude\/spec\/00_INDEX\.md$/.test(fp) && !specEditOpen) {
      block('.claude/spec/ 는 읽기전용 지식(SoT) — 수정 금지. 구조를 고쳐야 하면 사람이 build-state.json 의 `spec_edit` 를 true 로 연다 (00_INDEX.md 는 상시 예외)');
    }
    if (/(^|\/)\.env(\.|$)/.test(fp)) block('.env 비밀값은 사람이 입력 — 구조만 생성');
  }
  process.exit(0);
});
