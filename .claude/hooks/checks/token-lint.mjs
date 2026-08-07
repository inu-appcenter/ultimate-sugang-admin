#!/usr/bin/env node
// 값싼 시각 제어(5계층): src 의 .ts/.tsx 에서 raw hex 컬러 / Tailwind 하드코딩 arbitrary 값을 탐지.
// 토큰 정의 파일(globals.css, tailwind.config 등)은 allow 목록으로 제외.
// exit 0 = 위반 없음, exit 1 = 위반.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.cwd();
const srcDir = join(root, 'src');
const allowPath = join(here, 'token-lint.allow.txt');
const allow = existsSync(allowPath)
  ? readFileSync(allowPath, 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'))
  : [];

const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/;          // #abc / #aabbcc / #aabbccdd
const ARBITRARY = /\[(?:#[0-9a-fA-F]{3,8}|-?\d+(?:\.\d+)?px)\]/;                 // [#fff] / [13px]

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    // shadcn/ui 생성물(src/components/ui)만 정확히 제외 — 디렉토리명 'ui' 통째 제외 금지(#11).
    if (st.isDirectory()) {
      if (name === 'node_modules') continue;
      if (p.replace(/\\/g, '/').endsWith('/components/ui')) continue;
      walk(p, out);
    }
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}
const isAllowed = (p) => allow.some(a => p.includes(a));

const violations = [];
for (const file of walk(srcDir)) {
  if (isAllowed(file)) continue;
  const rel = file.replace(root + '/', '');
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;
    if (HEX.test(line)) violations.push(`${rel}:${i + 1}  raw hex — DS-01 토큰 사용`);
    if (ARBITRARY.test(line)) violations.push(`${rel}:${i + 1}  하드코딩 arbitrary 값 — 토큰/유틸 사용`);
  });
}
if (violations.length === 0) { console.log('token-lint OK'); process.exit(0); }
console.error(`token-lint FAIL (${violations.length})`);
for (const v of violations) console.error('  ' + v);
process.exit(1);
