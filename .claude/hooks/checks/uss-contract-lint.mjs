#!/usr/bin/env node
/**
 * uss-contract-lint.mjs — USS 계약 위반을 기계적으로 잡는다.
 *
 * 이 스크립트가 있는 이유: 아래 규칙들은 전부 "보면 바로 아는" 것이라 사람/모델의 판단이 필요 없다.
 * 판단이 필요 없는 것을 리뷰어에게 맡기면 놓칠 수 있으므로 여기서 결정적으로 막는다.
 * 판단이 필요한 항목(타이포 위계, 색 비중, 문구 어조 등)은 여전히 agents/ 리뷰어의 몫이다.
 *
 * 사용: node .claude/hooks/checks/uss-contract-lint.mjs
 * 출력: `uss-contract-lint OK` (exit 0) 또는 위반 목록 (exit 1)
 * 예외: `uss-contract-lint.allow.txt` 에 `경로조각::규칙ID` 한 줄씩.
 *
 * 규칙의 근거는 rules/api-contract.md · rules/antipatterns.md · rules/decisions.md 다.
 * 규칙을 바꾸려면 그 문서를 먼저 고치고 여기를 맞춘다(반대 방향 금지).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { D4_PRODUCES, D4_SCOPE } from './d4-strategy.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.cwd();
const srcDir = join(root, 'src');

// ── 예외 목록 ────────────────────────────────────────────────
const allowPath = join(here, 'uss-contract-lint.allow.txt');
const allowEntries = existsSync(allowPath)
  ? readFileSync(allowPath, 'utf8')
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('#'))
      .map((s) => {
        const [path, rule] = s.split('::');
        return { path: (path || '').trim(), rule: (rule || '').trim() };
      })
  : [];
const isAllowed = (file, ruleId) =>
  allowEntries.some((a) => file.includes(a.path) && (!a.rule || a.rule === ruleId));

// ── 규칙: 한 줄 안에서 정규식으로 판정되는 것들 ───────────────
// id 는 예외 목록에서 쓰는 키다. 바꾸면 allow 파일도 같이 바꿔야 한다.
const LINE_RULES = [
  // 가장 흔한 오답 (rules/api-contract.md §0)
  { id: 'auth-header', re: /\bAuthorization\b|\bBearer\b/, msg: '인증 헤더는 `access-token` 이다. Authorization/Bearer 금지' },
  { id: 'refresh-token', re: /\brefreshToken\b|\bRefreshToken\b/, msg: 'refresh 토큰이 존재하지 않는다. access 단일 토큰만' },
  { id: 'auth-client-split', re: /\bauthApiClient\b/, msg: 'axios 인스턴스는 `apiClient` 1개다. 분리 금지' },
  { id: 'utc-convert', re: /\.toISOString\s*\(/, msg: 'datetime 은 오프셋 없는 KST 로컬 문자열이다. UTC 변환 금지' },
  { id: 'date-parse', re: /new\s+Date\s*\(/, msg: 'API datetime 을 Date 로 파싱하지 않는다. 문자열 슬라이스로 처리' },
  { id: 'page-size', re: /\b(pageSize|size)\s*[:=]\s*20\b/, msg: '페이지 크기는 10 고정이다(서버 고정, size 파라미터 없음)' },

  // 타입·계약 (rules/antipatterns.md)
  { id: 'any-type', re: /:\s*any\b|<any>|\bas\s+any\b/, msg: '`any` 금지. 응답은 Zod 스키마로 파싱해 타입을 얻는다' },
  { id: 'ts-suppress', re: /@ts-(ignore|expect-error|nocheck)/, msg: '타입 오류를 주석으로 덮지 않는다. 타입을 맞춘다' },
  { id: 'null-coalesce', re: /\?\?\s*(0\b|''|"")/, msg: '`?? 0` / `?? \'\'` 로 null 을 뭉개지 않는다. null(미확정)과 0(없음)은 다르다' },

  // 금지 Job 상태 (rules/decisions.md D11)
  { id: 'job-status', re: /['"](PREVIEW|PENDING|PENDING_APPLY|CANCELED|CANCELLED)['"]/, msg: 'Job 중간 상태는 RUNNING 하나뿐이다(D11). 상태 추가 금지' },

  // 시각 (rules/ui-conventions.md)
  { id: 'dark-mode', re: /\bdark:/, msg: '라이트 모드 전용이다. dark: 클래스 금지' },
  { id: 'responsive', re: /(?:^|["'\s:])(sm|md|lg|xl|2xl):[a-z[]/, msg: '데스크톱 1280px+ 단일 폭이다. 반응형 breakpoint 금지' },
  { id: 'media-query', re: /@media\b/, msg: '반응형 코드 금지(@media)' },
  { id: 'removed-token', re: /\b(sidebar-width|menu-gap|border-active-menu|border-changed-input|primary-bg-badge|text-display)\b/, msg: 'DS-01 에서 제거된 토큰이다. 참조 금지' },
  { id: 'removed-semantic', re: /\b(text|bg|ring|border)-(info|accent)-/, msg: '`info`/`accent` 는 DS-01 에서 제거됐다. 다시 도입하지 않는다' },

  // 아키텍처 (rules/architecture.md)
  { id: 'relative-import', re: /\bfrom\s+['"]\.\.\//, msg: 'import 는 절대경로 `@/` alias 만 쓴다' },

  // 라우트 상수 (rules/architecture.md) — 정의 파일 자신은 제외한다.
  {
    id: 'route-literal',
    re: /(?:navigate\(|(?:to|href)=|path:\s*)['"]\/[a-z]/,
    msg: '경로 문자열을 직접 쓰지 않는다. `@/shared/constants/routes` 의 ROUTES 를 쓴다',
    skip: (rel) => rel.replace(/\\/g, '/').endsWith('src/shared/constants/routes.ts'),
  },

  // 시각 — shadcn 기본 radius (rules/ui-conventions.md · DS-01 §4-1)
  {
    id: 'shadcn-radius',
    re: /\brounded-(?:sm|md|lg)\b/,
    msg: 'shadcn 기본 radius 를 그대로 두지 않는다. 카드 `rounded-card`(14) · 버튼 `rounded-btn`(10) · 모달 `rounded-modal`(16)',
  },

  // 도메인 결정 D2 — 두 필드는 서비스 소유라 동기화 계약에 등장하지 않는다.
  {
    id: 'd2-service-owned',
    re: /\b(maxCapacity|currentEnrollment)\b/,
    msg: '`maxCapacity`·`currentEnrollment` 는 학교 API 28필드에 없다(D2). changedFields 라벨이나 화면에 넣지 않는다',
  },
];

// ── 규칙: 엔드포인트 allowlist (rules/api-contract.md) ─────────
const ALLOWED_ENDPOINTS = new Set([
  'POST /auth/login',
  'POST /auth/refresh',
  'GET /semesters/display',
  'PUT /semesters/display',
  'GET /courses/summary',
  'POST /sync/preflight',
  'POST /sync/jobs',
  'GET /sync/jobs',
  'GET /sync/jobs/{id}',
  'GET /sync/jobs/{id}/details',
]);
const ALLOWED_PATHS = new Set([...ALLOWED_ENDPOINTS].map((e) => e.split(' ')[1]));
// API 경로처럼 생긴 문자열/템플릿 리터럴. 라우트(`/login`, `/`)와 base URL(`/api/v1/admin`)은
// 접두사가 달라 걸리지 않는다. `admin` 을 포함시키는 이유는 `/admin/me` 류의 호출을 잡기 위해서다.
const API_PATH = /['"`](\/(?:auth|semesters|courses|sync|admin)(?:\/[^'"`]*)?)['"`]/g;

// ── 금지 라이브러리 (rules/antipatterns.md) ───────────────────
const FORBIDDEN_DEPS = [
  '@emotion/react', '@emotion/styled', 'styled-components',
  'formik', '@reduxjs/toolkit', 'redux', 'swr',
  'moment', 'dayjs', 'date-fns',
];

// ── 파일 수집 ────────────────────────────────────────────────
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules') continue;
      // shadcn/ui 생성물은 우리 코드가 아니다 — token-lint 와 같은 기준으로 제외.
      if (p.replace(/\\/g, '/').endsWith('/components/ui')) continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

const violations = [];
const add = (file, line, ruleId, msg) => {
  const rel = file.replace(root + '/', '');
  violations.push(`${rel}:${line}  [${ruleId}] ${msg}`);
};

// ── 1) 소스 스캔 ─────────────────────────────────────────────
for (const file of walk(srcDir)) {
  const rel = file.replace(root + '/', '');
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const isFeature = /(^|\/)src\/features\/([^/]+)\//.exec(rel.replace(/\\/g, '/'));
  const ownFeature = isFeature ? isFeature[2] : null;

  lines.forEach((line, i) => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return; // 주석은 건너뛴다
    const n = i + 1;

    for (const rule of LINE_RULES) {
      if (!rule.re.test(line)) continue;
      if (rule.skip && rule.skip(rel)) continue;
      if (isAllowed(rel, rule.id)) continue;
      add(file, n, rule.id, rule.msg);
    }

    // 엔드포인트 allowlist
    if (!isAllowed(rel, 'endpoint')) {
      for (const m of line.matchAll(API_PATH)) {
        // `${jobId}` 같은 보간을 {id} 로 정규화한 뒤 대조한다.
        const normalized = m[1].replace(/\$\{[^}]*\}/g, '{id}').replace(/\/+$/, '');
        if (ALLOWED_PATHS.has(normalized)) continue;
        add(file, n, 'endpoint', `명세에 없는 엔드포인트 \`${m[1]}\` — 9개 외 호출 금지`);
      }
    }

    // 전략 값 생산 금지(D4). mocks/ 는 서버 역할이라 대상에서 뺀다.
    const relPosix = rel.replace(/\\/g, '/');
    if (D4_SCOPE.some((p) => relPosix.startsWith(p)) && !isAllowed(rel, 'd4-strategy')) {
      if (D4_PRODUCES.some((re) => re.test(line))) {
        add(file, n, 'd4-strategy', '적재 전략은 서버가 판정한다(D4). 클라이언트가 전략 값을 만들지 않는다 — preflight 응답을 그대로 되돌려 보낸다');
      }
    }

    // features 간 직접 import
    if (ownFeature && !isAllowed(rel, 'cross-feature')) {
      const cross = /from\s+['"]@\/features\/([^/'"]+)/.exec(line);
      if (cross && cross[1] !== ownFeature) {
        add(file, n, 'cross-feature', `features/${ownFeature} → features/${cross[1]} 직접 import 금지. 공유는 shared/ 로 올린다`);
      }
    }
  });
}

// ── 2) 도메인은 3개뿐 (rules/architecture.md) ─────────────────
const ALLOWED_DOMAINS = new Set(['auth', 'semester', 'sync']);
const featuresDir = join(srcDir, 'features');
if (existsSync(featuresDir)) {
  for (const name of readdirSync(featuresDir)) {
    if (!statSync(join(featuresDir, name)).isDirectory()) continue;
    if (ALLOWED_DOMAINS.has(name)) continue;
    if (isAllowed(`src/features/${name}`, 'feature-domain')) continue;
    violations.push(
      `src/features/${name}  [feature-domain] 도메인은 auth·semester·sync 3개뿐이다. 다른 도메인을 만들지 않는다`,
    );
  }
}

// ── 3) 구조 규칙 (rules/architecture.md · decisions D8) ───────
// 전부 파일 배치와 이름만 보면 판정된다.
const INFRA_FILES = ['tokenManager', 'refreshQueue', 'errorHandler', 'client'];
const MODULE_FILES = ['api.ts', 'schemas.ts', 'queries.ts', 'store.ts'];

if (existsSync(srcDir)) {
  const files = walk(srcDir).map((f) => f.replace(root + '/', '').replace(/\\/g, '/'));

  // (a) 역방향 참조 — shared/ 는 features/ 를 모른다
  for (const rel of files.filter((f) => f.startsWith('src/shared/'))) {
    if (isAllowed(rel, 'shared-to-feature')) continue;
    readFileSync(join(root, rel), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (/from\s+['"]@\/features\//.test(line)) {
          violations.push(`${rel}:${i + 1}  [shared-to-feature] shared/ 가 features/ 를 참조하지 않는다. 의존 방향은 features → shared 한쪽이다`);
        }
      });
  }

  // (b) 쿼리 훅 파일명은 queries.ts 다 (04 §4)
  for (const rel of files.filter((f) => /^src\/features\/[^/]+\/hooks\.ts$/.test(f))) {
    if (isAllowed(rel, 'hooks-filename')) continue;
    violations.push(`${rel}  [hooks-filename] 쿼리 훅 파일은 \`queries.ts\` 다. \`hooks.ts\` 를 만들지 않는다`);
  }

  // (c) 모듈 배치 — api/schemas/queries/store 는 feature 루트에 둔다
  for (const rel of files) {
    const m = /^src\/features\/([^/]+)\/(.+)$/.exec(rel);
    if (!m) continue;
    const [, , tail] = m;
    if (!tail.includes('/')) continue;
    const base = tail.slice(tail.lastIndexOf('/') + 1);
    if (!MODULE_FILES.includes(base)) continue;
    if (isAllowed(rel, 'module-placement')) continue;
    violations.push(`${rel}  [module-placement] \`${base}\` 는 feature 루트에 둔다(04 §4). 하위 폴더로 내리지 않는다`);
  }

  // (d) 인프라 위치 — shared/api/ 밖에 같은 이름을 두지 않는다
  for (const rel of files) {
    const base = rel.slice(rel.lastIndexOf('/') + 1).replace(/\.tsx?$/, '');
    if (!INFRA_FILES.includes(base)) continue;
    if (rel.startsWith('src/shared/api/')) continue;
    if (isAllowed(rel, 'infra-location')) continue;
    violations.push(`${rel}  [infra-location] \`${base}\` 는 \`shared/api/\` 에 둔다(04 §4)`);
  }

  // (e) 이름 규칙 — 컴포넌트 PascalCase.tsx · 훅 useXxx.ts · 그 외 camelCase.ts
  for (const rel of files) {
    if (isAllowed(rel, 'file-naming')) continue;
    const base = rel.slice(rel.lastIndexOf('/') + 1);
    const stem = base.replace(/\.tsx?$/, '');
    if (/\.d\.ts$/.test(base) || stem === 'vite-env') continue;
    // src/app/ 은 부트스트랩·라우터·프로바이더다(architecture.md §구조). 컴포넌트 규칙 대상이 아니다.
    if (rel.startsWith('src/app/')) continue;
    if (base.endsWith('.tsx')) {
      if (!/^[A-Z][A-Za-z0-9]*$/.test(stem)) {
        violations.push(`${rel}  [file-naming] 컴포넌트 파일은 PascalCase.tsx 다`);
      }
    } else if (stem.startsWith('use')) {
      if (!/^use[A-Z][A-Za-z0-9]*$/.test(stem)) {
        violations.push(`${rel}  [file-naming] 훅 파일은 useXxx.ts 다`);
      }
    } else if (!/^[a-z][A-Za-z0-9]*$/.test(stem)) {
      violations.push(`${rel}  [file-naming] 유틸 파일은 camelCase.ts 다`);
    }
  }

  // (f) Zod 검증 — 응답은 스키마를 거친다. any 가 없다는 것으로는 증명되지 않는다
  for (const rel of files.filter((f) => /^src\/features\/[^/]+\/api\.ts$/.test(f))) {
    if (isAllowed(rel, 'zod-parse')) continue;
    if (/\.(safeParse|parse)\s*\(/.test(readFileSync(join(root, rel), 'utf8'))) continue;
    violations.push(`${rel}  [zod-parse] 응답을 Zod 로 파싱하지 않는다. \`parse\`/\`safeParse\` 를 거친다`);
  }

  // (g) 화면은 2개다 (D8)
  const pagesDir = join(srcDir, 'pages');
  if (existsSync(pagesDir)) {
    const pages = readdirSync(pagesDir).filter((n) => n.endsWith('.tsx'));
    if (pages.length > 2 && !isAllowed('src/pages', 'screen-count')) {
      violations.push(`src/pages  [screen-count] 화면은 ADMIN_LOGIN·SYNC_MAIN 2개뿐이다(D8). 지금 ${pages.length}개: ${pages.join(', ')}`);
    }
  }
}

// ── 4) package.json 의존성 ───────────────────────────────────
const pkgPath = join(root, 'package.json');
if (existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const dep of FORBIDDEN_DEPS) {
      if (deps[dep] && !isAllowed('package.json', 'forbidden-dep')) {
        violations.push(`package.json  [forbidden-dep] 도입 금지 라이브러리 \`${dep}\``);
      }
    }
  } catch {
    violations.push('package.json  [parse] 파싱 불가');
  }
}

// ── 결과 ─────────────────────────────────────────────────────
if (violations.length === 0) {
  console.log('uss-contract-lint OK');
  process.exit(0);
}
console.error(`uss-contract-lint FAIL (${violations.length})`);
for (const v of violations) console.error('  ' + v);
console.error('\n근거: .claude/rules/api-contract.md · antipatterns.md · decisions.md');
console.error('의도된 예외는 .claude/hooks/checks/uss-contract-lint.allow.txt 에 `경로조각::규칙ID` 로 등록한다.');
process.exit(1);
