#!/usr/bin/env node
/**
 * spec-map.mjs — spec/ 의 절 번호를 실제 행 범위로 옮긴다.
 *
 * 이 스크립트가 있는 이유: phase 문서와 00_INDEX 가 `04 §6`(240-424) 처럼 행 범위를 손으로 박고 있었다.
 * spec 을 한 줄만 고쳐도 그 숫자가 전부 어긋나는데 티가 나지 않는다 — 잘못된 구간을 조용히 읽게 된다.
 * 그래서 절 번호만 쓰고 행은 여기서 만든다.
 *
 * 사용:
 *   node .claude/hooks/checks/spec-map.mjs            # 생성 → resource/spec-map.json
 *   node .claude/hooks/checks/spec-map.mjs --check    # 생성물이 최신인지 (게이트용, OK/FAIL)
 *   node .claude/hooks/checks/spec-map.mjs "03 §6"    # 그 절의 Read offset/limit 을 출력
 *
 * 절 표기 규약: `## 6. 제목` → `§6`, `### 6-4. 제목` → `§6-4`. 번호 없는 헤딩(목차 등)은 무시한다.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));            // .claude/hooks/checks
const specDir = join(here, '..', '..', 'spec');
const outPath = join(here, '..', '..', 'resource', 'spec-map.json');

/** 파일명 → 약어. 00_INDEX 는 지식이 아니라 네비게이션이라 뺀다. */
const abbrev = (file) => {
  const m = /^(\d{2})_/.exec(file);
  if (m) return m[1] === '00' ? null : m[1];
  const ds = /^(DS-\d{2})_/.exec(file);
  return ds ? ds[1] : null;
};

export function buildSpecMap(dir = specDir) {
  const map = {};
  if (!existsSync(dir)) return map;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const doc = abbrev(file);
    if (!doc) continue;
    const lines = readFileSync(join(dir, file), 'utf8').split('\n');
    const heads = [];
    lines.forEach((line, i) => {
      const h2 = /^##\s+(\d+)\.\s*(.*)$/.exec(line);
      const h3 = /^###\s+(\d+)-(\d+)\.\s*(.*)$/.exec(line);
      if (h2) heads.push({ level: 2, key: `§${h2[1]}`, title: h2[2].trim(), line: i + 1 });
      else if (h3) heads.push({ level: 3, key: `§${h3[1]}-${h3[2]}`, title: h3[3].trim(), line: i + 1 });
    });
    heads.forEach((h, idx) => {
      // 끝 = 같은 레벨 이상(더 굵은) 헤딩이 다시 나오기 직전. 마지막이면 문서 끝.
      let end = lines.length;
      for (let j = idx + 1; j < heads.length; j += 1) {
        if (heads[j].level <= h.level) { end = heads[j].line - 1; break; }
      }
      map[`${doc} ${h.key}`] = { file, lines: [h.line, end], title: h.title };
    });
  }
  return map;
}

const args = process.argv.slice(2);
const map = buildSpecMap();

if (args[0] && args[0] !== '--check') {
  const key = args.join(' ').replace(/\s+/g, ' ').trim();
  const hit = map[key];
  if (!hit) {
    console.error(`알 수 없는 절: ${key}\n가능한 키 예시: ${Object.keys(map).slice(0, 8).join(' · ')}`);
    process.exit(1);
  }
  const [from, to] = hit.lines;
  console.log(`${key} — ${hit.title}`);
  console.log(`  파일: .claude/spec/${hit.file}`);
  console.log(`  Read: offset=${from} limit=${to - from + 1}   (행 ${from}-${to}, ${to - from + 1}줄)`);
  process.exit(0);
}

const rendered = JSON.stringify(map, null, 2) + '\n';

if (args[0] === '--check') {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current === rendered) { console.log('spec-map OK'); process.exit(0); }
  console.error('spec-map FAIL — spec/ 이 바뀌었는데 resource/spec-map.json 이 낡았다.');
  console.error('  고치는 법: node .claude/hooks/checks/spec-map.mjs');
  process.exit(1);
}

writeFileSync(outPath, rendered, 'utf8');
console.log(`spec-map 생성 — 절 ${Object.keys(map).length}개 → .claude/resource/spec-map.json`);
