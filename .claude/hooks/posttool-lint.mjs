#!/usr/bin/env node
// PostToolUse 훅: 방금 수정한 파일만 eslint --fix(빠른 피드백, 비차단). exit 0 고정.
import { spawnSync } from 'node:child_process';
let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  let ev = {};
  try { ev = JSON.parse(raw || '{}'); } catch { process.exit(0); }
  const input = ev.tool_input || {};
  const fp = String(input.file_path || input.path || '');
  if (!/\.(tsx?|jsx?)$/.test(fp) || !fp.includes('/src/') && !fp.startsWith('src/')) process.exit(0);
  const r = spawnSync('npx', ['eslint', '--fix', fp], { encoding: 'utf8' });
  if (r.status && r.status !== 0) process.stderr.write(`eslint 잔여 경고/에러: ${fp}\n${r.stdout || ''}`);
  process.exit(0); // 여기서는 막지 않는다 — 막는 건 Stop 게이트의 몫
});
