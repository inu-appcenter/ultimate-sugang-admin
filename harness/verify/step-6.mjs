/** step-6:expand_detail — Expandable Row · Tab Group · 더 보기 · Field Diff · 실패 Job. */
import { delay, http, HttpResponse } from 'msw';

import { createChecker, createRuntime, installDom } from './env.mjs';

installDom();
const { load, server, close } = await createRuntime();

const { mockDb } = await load('/src/mocks/db.ts');
const { tokenManager } = await load('/src/shared/api/tokenManager.ts');
const { installRefreshInterceptor } = await load('/src/shared/api/refreshQueue.ts');
const { login } = await load('/src/features/auth/api.ts');
const { queryClient } = await load('/src/shared/api/queryClient.ts');
const { academicYearOptions } = await load('/src/shared/lib/academicYearOptions.ts');
const probe = await load('/harness/verify/probe.tsx');

installRefreshInterceptor();

const { result, check, eq, section } = createChecker();

const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

/** 확장 패널은 화면에서 '실행자' 를 쓰는 유일한 곳이다. 존재가 아니라 개수를 센다. */
const panelCount = (html) => (text(html).match(/실행자/g) ?? []).length;

/** 목록 행 수 — 학수번호 셀만 `class="font-mono"` 단독이다. */
const listRowCount = (html) => (html.match(/class="font-mono"/g) ?? []).length;

const tabTag = (html, changeType) =>
  new RegExp(`<button[^>]*id="sync-change-tab-${changeType}"[^>]*>`).exec(html)?.[0] ?? '';
const isDisabled = (tag) => /\sdisabled(?:=|\s|$)/.test(tag);
const isActive = (tag) => tag.includes('data-state="active"');
const countOf = (html, word) => (text(html).match(new RegExp(word, 'g')) ?? []).length;
/** 클래스 이름은 태그 안에 있어 text() 로는 안 보인다. 마크업 원문에서 센다. */
const classCount = (html, name) => (html.match(new RegExp(name, 'g')) ?? []).length;

const JOB_41 = '2026-08-05 14:22';
const JOB_40 = '2026-07-28 16:40';
const JOB_39 = '2026-07-20 09:05';

const RUNNING_JOB_ID = 99;

const requestUrls = [];
server.events.on('request:start', ({ request }) => requestUrls.push(request.url));
const detailUrls = () => requestUrls.filter((url) => url.includes('/details'));

function seedRunningJob() {
  mockDb.reset();
  queryClient.clear();
  requestUrls.length = 0;
  const job = {
    jobId: RUNNING_JOB_ID,
    academicYear: 2026,
    term: 'FIRST',
    strategy: 'UPSERT',
    status: 'RUNNING',
    executedBy: '김학사',
    startedAt: '2026-08-09T10:00:00',
    finishedAt: null,
    durationSeconds: null,
    fetchedCourseCount: null,
    fetchedScheduleCount: null,
    createdCount: null,
    updatedCount: null,
    closedCount: null,
    warningCount: null,
    progress: { phase: 'COURSE_FETCH', current: 0, total: null },
    partiallyApplied: false,
    failureReason: null,
  };
  mockDb.state.jobs.unshift(job);
  return job;
}

const fresh = () => {
  mockDb.reset();
  queryClient.clear();
  requestUrls.length = 0;
};

await login({ loginId: 'haksa01', password: 'uss1234!' }).then((token) =>
  tokenManager.set(token.accessToken, token.name),
);

section('확장은 동시에 1행만 (01 §6-5 · 04 §10-6)');
{
  fresh();
  const [initial, first, second, collapsed] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { clickRow: JOB_41, wait: 700 },
    { clickRow: JOB_40, wait: 700 },
    { clickRow: JOB_40, wait: 500 },
  ]);

  eq('열기 전에는 확장이 없다', panelCount(initial), 0);
  eq('한 행을 열면 확장 1개', panelCount(first), 1);
  eq('다른 행을 열어도 확장은 1개', panelCount(second), 1);
  check('열린 행이 두 번째 행으로 바뀌었다', text(second).includes('학교 API 호출 실패'));
  check('첫 행 내용은 사라졌다', !text(second).includes('시간표 2,891건'));
  eq('같은 행을 다시 누르면 접힌다', panelCount(collapsed), 0);
}

section('메타 행 — 실행자 · 소요 · 수집 (01 §6-5 · 03 §6-4)');
{
  fresh();
  const [, opened] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { clickRow: JOB_41, wait: 700 },
  ]);
  const body = text(opened);

  check('실행자', body.includes('실행자 김학사'));
  check('소요는 HH:mm:ss 로 변환한다', body.includes('소요 00:01:47'));
  check('수집 건수는 천단위 콤마', body.includes('수집 강의 1,215건 · 시간표 2,891건'));
}

section('기본 탭 = 0 이 아닌 최좌측 · 0 건 탭 비활성 (04 §10-6)');
{
  fresh();
  const [, opened] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { clickRow: JOB_41, wait: 700 },
  ]);

  check('신규가 활성 탭', isActive(tabTag(opened, 'CREATED')));
  check('건수가 라벨에 붙는다', text(opened).includes('신규 12'));
  eq(
    '네 탭 모두 살아 있다',
    ['CREATED', 'UPDATED', 'CLOSED', 'WARNING'].filter((type) =>
      isDisabled(tabTag(opened, type)),
    ),
    [],
  );

  // 신규가 0 이면 기본 탭이 수정으로 밀리고 신규 탭은 꺼진다.
  fresh();
  server.use(
    http.get('http://localhost:8080/api/v1/admin/sync/jobs/41', () =>
      HttpResponse.json({
        ...mockDb.findJob(41),
        createdCount: 0,
        warningCount: 0,
      }),
    ),
  );
  const [, shifted] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { clickRow: JOB_41, wait: 700 },
  ]);

  check('0 건이면 기본 탭이 다음으로 밀린다', isActive(tabTag(shifted, 'UPDATED')));
  check('신규 탭 비활성', isDisabled(tabTag(shifted, 'CREATED')));
  check('경고 탭 비활성', isDisabled(tabTag(shifted, 'WARNING')));
  check('폐강 탭은 살아 있다', !isDisabled(tabTag(shifted, 'CLOSED')));

  server.resetHandlers();
}

section('changeType 은 필수 쿼리 · page 는 1 부터 (03 §6-5)');
{
  fresh();
  await probe.renderSyncMainSteps([{ wait: 700 }, { clickRow: JOB_41, wait: 700 }]);

  eq('확장 시 목록을 한 번 부른다', detailUrls().length, 1);
  const url = new URL(detailUrls()[0]);
  eq('경로', url.pathname, '/api/v1/admin/sync/jobs/41/details');
  eq('changeType 은 기본 탭', url.searchParams.get('changeType'), 'CREATED');
  eq('page 는 1 부터', url.searchParams.get('page'), '1');
}

section('[더 보기] — 10건씩 누적, hasNextPage=false 면 숨김 (03 §6-5 · 01 §6-5)');
{
  fresh();
  const [, , firstPage, secondPage] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { clickRow: JOB_41, wait: 700 },
    { clickId: 'sync-change-tab-UPDATED', wait: 700 },
    { click: '더 보기', wait: 700 },
  ]);

  eq('최초 10건', listRowCount(firstPage), 10);
  eq('[더 보기] 가 보인다', countOf(firstPage, '더 보기'), 1);
  eq('누르면 누적된다', listRowCount(secondPage), 12);
  eq('마지막 페이지면 사라진다', countOf(secondPage, '더 보기'), 0);

  const pages = detailUrls()
    .filter((url) => url.includes('changeType=UPDATED'))
    .map((url) => new URL(url).searchParams.get('page'));
  eq('page 를 1씩 올린다', pages, ['1', '2']);
}

section('Field Diff — 수정 탭만 변경 내용을 보여준다 (01 §6-5 · 03 §8-4)');
{
  fresh();
  const [, created, updated] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { clickRow: JOB_41, wait: 700 },
    { clickId: 'sync-change-tab-UPDATED', wait: 700 },
  ]);

  check('신규 탭에는 변경 내용 컬럼이 없다', !text(created).includes('변경 내용'));
  check('수정 탭에는 있다', text(updated).includes('변경 내용'));
  check(
    '{라벨} {before} → {after}',
    text(updated).includes('강의실·시간 월1,2 (4호관301) → 월1,2 (4호관305)'),
  );
  check('03 §8-4 라벨 매핑', text(updated).includes('원어강의'));
  check('D2 필드는 나타나지 않는다', !text(updated).includes('정원'));
}

section('경고 탭 — 학수번호 + 사유, courseName 은 null 가능 (01 §6-5 · D12)');
{
  fresh();
  const [, , warning] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { clickRow: JOB_41, wait: 700 },
    { clickId: 'sync-change-tab-WARNING', wait: 700 },
  ]);
  const body = text(warning);

  check('사유 컬럼', body.includes('사유'));
  check('과목명 컬럼은 없다', !body.includes('과목명'));
  check('사유 원문', body.includes('미등록 이수구분 코드: 99'));
  eq('두 건', listRowCount(warning), 2);
}

section('빈 탭 문구 · 부분 적용 (01 §9 · 03 §6-4)');
{
  fresh();
  const [, opened] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { clickRow: JOB_39, wait: 700 },
  ]);
  const body = text(opened);

  check('빈 탭 문구', body.includes('항목이 없어요.'));
  eq('목록 행이 없다', listRowCount(opened), 0);
  check('partiallyApplied 면 부분 적용', body.includes('부분 적용'));
}

section('실패 Job 확장 — 탭 대신 실패 사유 (01 §6-5 · 04 §10-6)');
{
  fresh();
  const [, opened] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { clickRow: JOB_40, wait: 700 },
  ]);
  const body = text(opened);

  eq('탭을 그리지 않는다', tabTag(opened, 'CREATED'), '');
  check('실패 사유 제목', body.includes('실패 사유'));
  check('사유 원문', body.includes('학교 API 호출 실패 (429 Too Many Requests) — PAGE 7'));
  check('안내 문구', body.includes('변경 사항은 적용되지 않았어요.'));
  eq('목록을 부르지 않는다', detailUrls().length, 0);
}

section('FAILED 종료 시 이력 최상단 행 자동 확장 (01 §8-1 · 04 §10-4)');
{
  const job = seedRunningJob();

  const [, running, failed] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { wait: 2400 },
    {
      wait: 3000,
      before: () => {
        job.status = 'FAILED';
        job.progress = null;
        job.finishedAt = '2026-08-09T10:02:00';
        job.durationSeconds = 12;
        job.failureReason = '학교 API 응답이 없습니다.';
      },
    },
  ]);

  eq('도는 동안에는 열지 않는다', panelCount(running), 0);
  eq('실패하면 한 행이 열린다', panelCount(failed), 1);
  check('열린 행이 방금 실패한 Job 이다', text(failed).includes('학교 API 응답이 없습니다.'));
  check('실패 토스트도 그대로', text(failed).includes('업데이트에 실패했어요.'));
}

section('SUCCESS 종료는 자동 확장하지 않는다 (04 §10-4)');
{
  const job = seedRunningJob();

  const [, , finished] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { wait: 2400 },
    {
      wait: 3000,
      before: () => {
        job.status = 'SUCCESS';
        job.progress = null;
        job.finishedAt = '2026-08-09T10:02:00';
        job.durationSeconds = 120;
        job.fetchedCourseCount = 1215;
        job.fetchedScheduleCount = 2891;
        job.createdCount = 12;
        job.updatedCount = 45;
        job.closedCount = 3;
        job.warningCount = 2;
      },
    },
  ]);

  check('성공 토스트', text(finished).includes('업데이트를 마쳤어요.'));
  eq('확장은 열리지 않는다', panelCount(finished), 0);
}

section('인라인 확장 4상태 — Skeleton 3행 / Error State 는 [다시 시도] 없음 (01 §9 · 04 §9-6)');
{
  fresh();
  server.use(
    http.get('http://localhost:8080/api/v1/admin/sync/jobs/41', async () => {
      await delay(600);
      return HttpResponse.json(mockDb.findJob(41));
    }),
  );

  const [, loading, loaded] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { clickRow: JOB_41, wait: 200 },
    { wait: 900 },
  ]);

  eq('Skeleton 3행', classCount(loading, 'animate-pulse'), 3);
  eq('데이터가 오면 걷힌다', classCount(loaded, 'animate-pulse'), 0);
  server.resetHandlers();

  fresh();
  server.use(
    http.get('http://localhost:8080/api/v1/admin/sync/jobs/41', () =>
      HttpResponse.json({ code: 5202, message: '상세를 불러오지 못했어요.' }, { status: 404 }),
    ),
  );

  const [, broken] = await probe.renderSyncMainSteps([
    { wait: 700 },
    { clickRow: JOB_41, wait: 2500 },
  ]);

  check('Error State 문구', text(broken).includes('상세를 불러오지 못했어요.'));
  eq('[다시 시도] 는 없다', countOf(broken, '다시 시도'), 0);
  server.resetHandlers();
  queryClient.clear();
}

section('연도 옵션 — 범위 밖 현재값을 감추지 않는다 (사용자 결정 2026-08-10)');
{
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const kstYear = new Date(Date.now() + KST_OFFSET_MS).getUTCFullYear();

  eq('범위 안이면 그대로 5개', academicYearOptions(kstYear).length, 5);

  const far = academicYearOptions(kstYear + 9);
  eq('범위 밖 값이 더해진다', far.length, 6);
  eq('오름차순 자리에 들어간다', far, [
    kstYear - 2,
    kstYear - 1,
    kstYear,
    kstYear + 1,
    kstYear + 2,
    kstYear + 9,
  ]);

  const past = academicYearOptions(kstYear - 9);
  eq('과거 값도 앞에 붙는다', past[0], kstYear - 9);
}

await close();
export default result;
