/** step-6:expand_detail — 확장 행 단일성 · 상세 쿼리 계약 · 더 보기 누적 · 종료 시 자동 확장. */
import { createChecker, createRuntime, installDom } from './env.mjs';

installDom();
const { load, server, close } = await createRuntime();

const { mockDb } = await load('/src/mocks/db.ts');
const { tokenManager } = await load('/src/shared/api/tokenManager.ts');
const { installRefreshInterceptor } = await load('/src/shared/api/refreshQueue.ts');
const { login } = await load('/src/features/auth/api.ts');
const { queryClient } = await load('/src/shared/api/queryClient.ts');
const probe = await load('/harness/verify/probe.tsx');

installRefreshInterceptor();

const { result, check, eq, section } = createChecker();

const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

/** 확장 패널은 화면에서 '실행자' 를 쓰는 유일한 곳이다. 존재가 아니라 개수를 센다. */
const panelCount = (html) => (text(html).match(/실행자/g) ?? []).length;

/** 목록 행 수 — 학수번호 셀만 `class="font-mono"` 단독이다. */
const listRowCount = (html) => (html.match(/class="font-mono"/g) ?? []).length;

const countOf = (html, word) => (text(html).match(new RegExp(word, 'g')) ?? []).length;

/** 이력 페이지네이션이 지금 몇 페이지를 가리키는지. */
const currentPage = (html) => {
  const found = /<button[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/button>/.exec(html);
  return found === null ? null : text(found[1]).trim();
};

const JOB_41 = '2026-08-05 14:22';
const JOB_40 = '2026-07-28 16:40';

const RUNNING_JOB_ID = 99;

const requestUrls = [];
server.events.on('request:start', ({ request }) => requestUrls.push(request.url));

const fresh = () => {
  mockDb.reset();
  queryClient.clear();
  requestUrls.length = 0;
};

function seedRunningJob() {
  fresh();
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
    progress: { phase: 'COURSE_FETCH' },
    partiallyApplied: false,
    failureReason: null,
  };
  mockDb.state.jobs.unshift(job);
  return job;
}

const failJob = (job) => {
  job.status = 'FAILED';
  job.progress = null;
  job.finishedAt = '2026-08-09T10:02:00';
  job.durationSeconds = 12;
  job.failureReason = '학교 API 응답이 없습니다.';
};

await login({ loginId: 'haksa01', password: 'uss1234!' }).then((token) =>
  tokenManager.set(token.accessToken, token.name),
);

section('확장은 동시에 1행만 (01 §6-5 · 04 §10-6)');
{
  fresh();
  const [initial, first, second, collapsed] = await probe.renderSyncMainSteps([
    { wait: 250 },
    { clickRow: JOB_41, wait: 250 },
    { clickRow: JOB_40, wait: 250 },
    { clickRow: JOB_40, wait: 250 },
  ]);

  eq('열기 전에는 확장이 없다', panelCount(initial), 0);
  eq('한 행을 열면 확장 1개', panelCount(first), 1);
  eq('다른 행을 열어도 확장은 1개', panelCount(second), 1);
  check('열린 행이 두 번째 행으로 바뀌었다', text(second).includes('학교 API 호출 실패'));
  check('첫 행 내용은 사라졌다', !text(second).includes('시간표 2,891건'));
  eq('같은 행을 다시 누르면 접힌다', panelCount(collapsed), 0);
}

section('changeType 은 필수 쿼리 · page 는 1 부터 (03 §6-5)');
{
  fresh();
  await probe.renderSyncMainSteps([{ wait: 250 }, { clickRow: JOB_41, wait: 250 }]);

  const details = requestUrls.filter((url) => url.includes('/details'));
  eq('확장 시 목록을 한 번 부른다', details.length, 1);
  const url = new URL(details[0]);
  eq('경로', url.pathname, '/api/v1/admin/sync/jobs/41/details');
  eq('changeType 은 기본 탭', url.searchParams.get('changeType'), 'CREATED');
  eq('page 는 1 부터', url.searchParams.get('page'), '1');
}

section('[더 보기] — 10건씩 누적, hasNextPage=false 면 숨김 (03 §6-5 · 01 §6-5)');
{
  fresh();
  const [, , firstPage, secondPage] = await probe.renderSyncMainSteps([
    { wait: 250 },
    { clickRow: JOB_41, wait: 250 },
    { clickId: 'sync-change-tab-UPDATED', wait: 250 },
    { click: '더 보기', wait: 250 },
  ]);

  eq('최초 10건', listRowCount(firstPage), 10);
  eq('[더 보기] 가 보인다', countOf(firstPage, '더 보기'), 1);
  eq('누르면 누적된다', listRowCount(secondPage), 12);
  eq('마지막 페이지면 사라진다', countOf(secondPage, '더 보기'), 0);

  const pages = requestUrls
    .filter((url) => url.includes('changeType=UPDATED'))
    .map((url) => new URL(url).searchParams.get('page'));
  eq('page 를 1씩 올린다', pages, ['1', '2']);
}

section('FAILED 종료 시 이력 최상단 행 자동 확장 (01 §8-1 · 04 §10-4)');
{
  const job = seedRunningJob();

  const [, running, failed] = await probe.renderSyncMainSteps([
    { wait: 250 },
    { wait: 250 },
    { wait: 400, before: () => failJob(job) },
  ]);

  eq('도는 동안에는 열지 않는다', panelCount(running), 0);
  eq('실패하면 한 행이 열린다', panelCount(failed), 1);
  check('열린 행이 방금 실패한 Job 이다', text(failed).includes('학교 API 응답이 없습니다.'));
}

section('2페이지를 보고 있어도 최상단 행으로 되돌아간다 (01 §8-1)');
{
  const job = seedRunningJob();

  const [, secondPage, failed] = await probe.renderSyncMainSteps([
    { wait: 250 },
    { click: '2', wait: 250 },
    { wait: 400, before: () => failJob(job) },
  ]);

  eq('2페이지로 이동했다', currentPage(secondPage), '2');
  eq('실패 뒤에는 1페이지로 돌아온다', currentPage(failed), '1');
  eq('한 행이 열린다', panelCount(failed), 1);
  check('열린 행이 방금 실패한 Job 이다', text(failed).includes('학교 API 응답이 없습니다.'));
}

section('SUCCESS 종료는 자동 확장하지 않는다 (04 §10-4)');
{
  const job = seedRunningJob();

  const [, , finished] = await probe.renderSyncMainSteps([
    { wait: 250 },
    { wait: 250 },
    {
      wait: 400,
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

await close();
export default result;
