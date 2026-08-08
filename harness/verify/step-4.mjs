/** step-4:SYNC_MAIN_shell — 카드 1·2 · 이력 테이블 · 4상태 · null 분기 · 페이지네이션. */
import { http, HttpResponse } from 'msw';

import { createChecker, createRuntime, installDom } from './env.mjs';

installDom();
const { load, server, close } = await createRuntime();

const { mockDb } = await load('/src/mocks/db.ts');
const { tokenManager } = await load('/src/shared/api/tokenManager.ts');
const { installRefreshInterceptor } = await load('/src/shared/api/refreshQueue.ts');
const { login } = await load('/src/features/auth/api.ts');
const { queryClient } = await load('/src/shared/api/queryClient.ts');
const { formatSemesterCompact, formatSemesterLong } = await load('/src/shared/lib/formatSemester.ts');
const { syncKeys } = await load('/src/features/sync/queries.ts');
const probe = await load('/harness/verify/probe.tsx');

installRefreshInterceptor();

const { result, check, eq, section } = createChecker();

const signIn = async () => {
  const token = await login({ loginId: 'haksa01', password: 'uss1234!' });
  tokenManager.set(token.accessToken, token.name);
};

/** 케이스마다 캐시를 비우고 새로 그린다. */
const render = async (settleMs) => {
  queryClient.clear();
  return probe.renderSyncMain(settleMs);
};

/** 카드 2 의 변경 요약 행. 테이블 헤더의 "신규" 와 섞이지 않게 패턴으로 본다. */
const CHANGE_SUMMARY = /신규 [\d,]+ · 수정 [\d,]+ · 폐강 [\d,]+/;

const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

await signIn();

section('학기 문자열 (01 §6-2, §6-4 · D 표시 순서)');
{
  eq('카드 표기', formatSemesterLong(2026, 'FIRST'), '2026학년도 1학기');
  eq('테이블 표기', formatSemesterCompact(2026, 'SUMMER'), '2026-여름계절학기');
  eq('겨울계절학기', formatSemesterCompact(2025, 'WINTER'), '2025-겨울계절학기');
}

section('Loading → Data (04 §10-1)');
{
  mockDb.reset();
  const { firstPaint, settled } = await render();

  check('첫 페인트는 skeleton', firstPaint.includes('animate-pulse'));
  check('첫 페인트에 데이터 없음', !firstPaint.includes('1,203'));

  const body = text(settled);
  check('페이지 타이틀', body.includes('강의 데이터 관리'));
  check('카드 1 값', body.includes('2026학년도 2학기'));
  check('카드 1 보조 문구', body.includes('서비스 화면에 보이는 학기예요.'));
  check('카드 1 버튼', body.includes('학기 설정'));
  check('카드 2 적재 학기', body.includes('2026학년도 1학기'));
  check('강의 건수 천단위 콤마', body.includes('1,203건'));
  check('시간표 건수', body.includes('2,847건'));
  check('수치가 text-metric', settled.includes('text-metric'));
  check('마지막 업데이트 전체 일시', body.includes('2026-08-05 14:22'));
  check('테이블 일시도 긴 형식 (01 §6-4)', body.includes('2026-07-28 16:40'));
  check('변경 요약', CHANGE_SUMMARY.test(body) && body.includes('신규 12 · 수정 45 · 폐강 3'));
  check('Primary 버튼', body.includes('데이터 업데이트'));
  check('이력 타이틀', body.includes('업데이트 이력'));
  check('대상 학기 컬럼', body.includes('2026-1학기'));
  check('실패 행 카운트는 - 표기', body.includes('-'));
  check('교체 배지가 명도 강조(neutral-strong)', settled.includes('bg-foreground'));
  check('성공 배지', settled.includes('bg-success-bg'));
  check('실패 배지', settled.includes('bg-danger-bg'));
  check('카드에 보더 없음', !/rounded-card[^"]*\bborder\b/.test(settled));
  check('다크·반응형 클래스 없음', !/\bdark:|\b(sm|md|lg|xl):/.test(settled));
  check('raw hex 없음', !/#[0-9a-fA-F]{6}\b/.test(settled));
}

section('페이지네이션 10행 고정 (03 §2-4)');
{
  mockDb.reset();
  const { settled } = await render();
  const rows = settled.match(/<tr/g)?.length;
  eq('헤더 1 + 본문 10행', rows, 11);
  check('페이지 번호 2 노출', text(settled).includes('2'));
  check('이전/다음 버튼', text(settled).includes('이전') && text(settled).includes('다음'));
}

section('테이블 divider — 헤더 아래 선이 살아 있어야 한다 (01 §6-4 · DS-00 §5-2)');
{
  mockDb.reset();
  const { settled } = await render();
  // last:border-0 을 tr 에 걸면 thead 의 tr 도 :last-child 라 헤더 divider 가 사라진다.
  check('tr 에 last:border-0 이 없다', !settled.includes('last:border-0'));
  // 마크업에서는 & 가 &amp; 로 이스케이프되므로 그 앞부분을 뺀 조각으로 본다.
  check('마지막 행만 지우는 규칙은 tbody 에 있다', settled.includes('_tr:last-child]:border-0'));
  const theadRow = /<thead[^>]*>\s*<tr class="([^"]*)"/.exec(settled);
  check('헤더 tr 이 border-b 를 갖는다', theadRow !== null && theadRow[1].includes('border-b'), theadRow?.[1]);
  check('컬럼 폭이 결정적(table-fixed)', settled.includes('table-fixed'));
}

section('재조회가 실패해도 Error State 와 본문이 겹치지 않는다 (01 §9)');
{
  mockDb.reset();
  queryClient.clear();
  // 이미 받아둔 데이터가 있는 상태를 만든다 (stale 로 두어 마운트 시 재조회가 돈다).
  queryClient.setQueryData(syncKeys.summary(), {
    semester: { academicYear: 2026, term: 'FIRST' },
    courseCount: 1203,
    scheduleCount: 2847,
    lastJob: null,
    runningJobId: null,
  });
  queryClient.setQueryDefaults(syncKeys.summary(), { staleTime: 0 });
  server.use(
    http.get('http://localhost:8080/api/v1/admin/courses/summary', () =>
      HttpResponse.json({ code: 9999, message: '서버 오류' }, { status: 500 }),
    ),
  );

  const { settled } = await probe.renderSyncMain(2500);
  const body = text(settled);
  check('기존 데이터는 그대로 보인다', body.includes('1,203건'));
  // 토스트 문구에도 "다시 시도해주세요."가 들어 있어서 버튼 노드로 구분한다.
  check('Error State 가 겹쳐 뜨지 않는다', !settled.includes('>다시 시도<'));
  check('알림은 토스트가 한다', body.includes('서버에 문제가 생겼어요.'));
  server.resetHandlers();
  queryClient.clear();
}

section('null 분기 — semester (04 §10-2)');
{
  mockDb.reset();
  mockDb.state.loadedSemester = null;
  mockDb.state.courseCount = 0;
  mockDb.state.scheduleCount = 0;
  const { settled } = await render();
  const body = text(settled);
  check('"아직 적재된 데이터가 없어요."', body.includes('아직 적재된 데이터가 없어요.'));
  check('건수 숨김', !body.includes('강의 0건'));
}

section('null 분기 — lastJob 과 이력 Empty (01 §9)');
{
  mockDb.reset();
  mockDb.state.jobs = [];
  const { settled } = await render();
  const body = text(settled);
  check('카드 2 "업데이트 이력이 없어요."', body.includes('업데이트 이력이 없어요.'));
  check('변경 요약 숨김', !CHANGE_SUMMARY.test(body));
  check('테이블 Empty State 아이콘', settled.includes('lucide-inbox'));
}

section('null 분기 — 마지막 Job 이 실패면 변경 요약을 숨긴다');
{
  mockDb.reset();
  mockDb.state.jobs = mockDb.state.jobs.filter((job) => job.status === 'FAILED');
  const { settled } = await render();
  const body = text(settled);
  check('상태 배지는 실패', body.includes('실패'));
  check('변경 요약 행 없음', !CHANGE_SUMMARY.test(body));
}

section('RUNNING — 버튼 비활성 + 툴팁 (01 §6-3)');
{
  mockDb.reset();
  mockDb.createJob({ academicYear: 2026, term: 'FIRST' }, 'UPSERT', '김학사');
  const { settled } = await render();
  check('업데이트 버튼 disabled', /<button[^>]*disabled[^>]*>[^<]*데이터 업데이트/.test(settled));
  check('진행 중 배지', text(settled).includes('진행 중'));
}

section('Error — 500 이면 Error State + [다시 시도] (01 §9)');
{
  mockDb.reset();
  server.use(
    http.get('http://localhost:8080/api/v1/admin/courses/summary', () =>
      HttpResponse.json({ code: 9999, message: '서버 오류' }, { status: 500 }),
    ),
    http.get('http://localhost:8080/api/v1/admin/sync/jobs', () =>
      HttpResponse.json({ code: 9999, message: '서버 오류' }, { status: 500 }),
    ),
  );
  // queries.retry = 1 이라 재시도(기본 지연 ~1초)가 끝나야 error 로 넘어간다.
  const { settled } = await render(2500);
  const body = text(settled);
  check('에러 문구', body.includes('서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요.'));
  check('[다시 시도] 버튼', settled.includes('>다시 시도<'));
  check('경고 아이콘 48px', settled.includes('h-12 w-12'));
  server.resetHandlers();
}

await close();
export default result;
