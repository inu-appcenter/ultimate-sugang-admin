/**
 * 검증 하네스 러너 — `npm run verify` (또는 `npm run verify -- step-3`).
 *
 * Step 마다 스크립트를 하나씩 두고 여기서 순서대로 돌린다. 각 스크립트는 자기 어서션 결과를
 * `{ total, failures }` 로 default export 한다. 하나라도 실패하면 exit 1.
 *
 * ⚠️ 스크립트는 서로 격리되지 않는다(같은 프로세스, 같은 jsdom). 하나씩 별도 프로세스로 돌린다.
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2];

const steps = readdirSync(here)
  .filter((name) => /^step-\d+.*\.mjs$/.test(name))
  .filter((name) => filter === undefined || name.startsWith(filter))
  .sort();

if (steps.length === 0) {
  console.error(filter === undefined ? '검증 스크립트가 없다.' : `일치하는 스크립트가 없다: ${filter}`);
  process.exit(1);
}

let failed = 0;
for (const step of steps) {
  console.log(`\n════ ${step} ════`);
  const run = spawnSync(process.execPath, [join(here, 'runOne.mjs'), join(here, step)], {
    stdio: 'inherit',
  });
  if (run.status !== 0) failed += 1;
}

console.log(`\n${failed === 0 ? `전부 통과 (${steps.length}개 스크립트)` : `${failed}개 스크립트 실패`}`);
process.exit(failed === 0 ? 0 : 1);
