/** step-5-4:polling — 2초 폴링 · 진행률 표기 · 재개 · 종료 처리. */
import { http, HttpResponse } from 'msw';

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
const RUNNING_JOB_ID = 99;

/** 22초짜리 mock 타임라인을 안 쓰고 Job 레코드를 직접 넣는다. 진행 단계를 손으로 민다. */
function seedRunningJob() {
  mockDb.reset();
  queryClient.clear();
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

const finish = (job, status) => {
  job.status = status;
  job.progress = null;
  job.finishedAt = '2026-08-09T10:02:00';
  job.durationSeconds = 120;
  if (status === 'SUCCESS') {
    job.fetchedCourseCount = 1215;
    job.fetchedScheduleCount = 2891;
    job.createdCount = 12;
    job.updatedCount = 45;
    job.closedCount = 3;
    job.warningCount = 2;
  } else {
    job.failureReason = '학교 API 응답이 없습니다.';
  }
};

await login({ loginId: 'haksa01', password: 'uss1234!' }).then((token) =>
  tokenManager.set(token.accessToken, token.name),
);

section('진입 시 자동 재개 + 진행률 표기 (01 §8-1 · 03 §7 · 04 §10-4)');
{
  const job = seedRunningJob();

  const [first, fetching, persisting, finished] = await probe.renderSyncMainSteps([
    { wait: 600 },
    {
      wait: 2400,
      before: () => {
        job.progress = { phase: 'COURSE_FETCH', current: 3, total: 12 };
      },
    },
    {
      wait: 2400,
      before: () => {
        job.progress = { phase: 'PERSIST', current: 450, total: 1203 };
      },
    },
    {
      wait: 2400,
      before: () => finish(job, 'SUCCESS'),
    },
  ]);

  check('실행 없이 폴링이 붙는다', text(first).includes('업데이트 진행 중'));
  check('total null 이면 분모 없이', text(first).includes('강의 수집 중…'));
  check('분모를 0 으로 뭉개지 않는다', !text(first).includes('강의 수집 0/0'));

  // 03 §7-2 는 수집만 띄어쓰고(3/12 페이지) 적재는 붙여 쓴다(450/1,203건). 통일하면 오답이다.
  check('수집은 띄어쓴 페이지', text(fetching).includes('강의 수집 3/12 페이지'));
  check('붙여쓴 페이지가 아니다', !text(fetching).includes('3/12페이지'));
  check('적재는 붙여쓴 건', text(persisting).includes('적재 450/1,203건'));
  check('건수에 천단위 콤마', text(persisting).includes('1,203건'));

  check('종료되면 진행률이 사라진다', !text(finished).includes('업데이트 진행 중'));
  check('성공 토스트', text(finished).includes('업데이트를 마쳤어요.'));
  eq('토스트는 한 번만', text(finished).match(/업데이트를 마쳤어요\./g)?.length, 1);
  check('버튼이 다시 활성', !/\sdisabled(?:=|\s|$)/.test(updateButtonTag(finished)));
}

section('폴링은 종료 뒤 멈춘다 (04 §10-4)');
{
  const job = seedRunningJob();
  let polls = 0;
  server.use(
    http.get(`http://localhost:8080/api/v1/admin/sync/jobs/${RUNNING_JOB_ID}`, () => {
      polls += 1;
      return HttpResponse.json(job);
    }),
  );

  let pollsAtFinish = 0;
  await probe.renderSyncMainSteps([
    { wait: 4500 },
    {
      wait: 2400,
      before: () => finish(job, 'SUCCESS'),
    },
    {
      wait: 5000,
      before: () => {
        pollsAtFinish = polls;
      },
    },
  ]);

  check('RUNNING 동안 여러 번 돈다', pollsAtFinish >= 3, `polls=${pollsAtFinish}`);
  eq('종료 뒤에는 더 부르지 않는다', polls, pollsAtFinish);

  server.resetHandlers();
}

section('FAILED 종료 (01 §8-1 · §9-1)');
{
  const job = seedRunningJob();

  const [, finished] = await probe.renderSyncMainSteps([
    { wait: 600 },
    { wait: 2400, before: () => finish(job, 'FAILED') },
  ]);

  const body = text(finished);
  check('실패 토스트', body.includes('업데이트에 실패했어요. 이력에서 사유를 확인해주세요.'));
  check('성공 토스트를 띄우지 않는다', !body.includes('업데이트를 마쳤어요.'));
  check('진행률이 사라진다', !body.includes('업데이트 진행 중'));
}

section('실행 직후에는 202 의 jobId 로 시작한다 (04 §10-3)');
{
  mockDb.reset();
  queryClient.clear();
  let polls = 0;
  server.use(
    // summary 가 아직 runningJobId 를 모르는 상태를 만든다.
    http.get('http://localhost:8080/api/v1/admin/courses/summary', () =>
      HttpResponse.json({
        semester: { academicYear: 2026, term: 'FIRST' },
        courseCount: 1203,
        scheduleCount: 2847,
        lastJob: null,
        runningJobId: null,
      }),
    ),
    http.post('http://localhost:8080/api/v1/admin/sync/jobs', () =>
      HttpResponse.json({ jobId: RUNNING_JOB_ID }, { status: 202 }),
    ),
    http.get(`http://localhost:8080/api/v1/admin/sync/jobs/${RUNNING_JOB_ID}`, () => {
      polls += 1;
      return HttpResponse.json({
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
        progress: { phase: 'TIMETABLE_FETCH', current: 7, total: 28 },
        partiallyApplied: false,
        failureReason: null,
      });
    }),
  );

  await probe.runSyncConfirmFlow({ actionLabel: '갱신', settleMs: 600 });
  check('summary 가 몰라도 폴링이 시작된다', polls >= 1, `polls=${polls}`);

  server.resetHandlers();
  queryClient.clear();
}

section('한 마운트 안에서 — 남의 Job 인계 + 끝난 Job 되살아나지 않기 (04 §10-4 · §9-2)');
{
  // ⚠️ 마운트를 갈면 launchedJobId 가 null 로 리셋돼 버그가 재현되지 않는다.
  // 실행부터 관측까지 한 마운트에서 이어 붙인다.
  mockDb.reset();
  queryClient.clear();
  const MINE = 41;
  const THEIRS = 77;
  const status = { [MINE]: 'RUNNING', [THEIRS]: 'RUNNING' };
  let runningJobId = null;
  let postCalls = 0;
  const polled = [];

  // 종료 처리 횟수를 직접 센다. 토스트 DOM 개수로는 안 걸린다 — 되살아난 쪽이 17ms
  // 늦게 떠서 두 장이 동시에 잡히지 않는다.
  const invalidated = [];
  const realInvalidate = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = (filters, options) => {
    invalidated.push(JSON.stringify(filters?.queryKey ?? []));
    return realInvalidate(filters, options);
  };

  const jobBody = (jobId) => ({
    jobId,
    academicYear: 2026,
    term: 'FIRST',
    strategy: 'UPSERT',
    status: status[jobId],
    executedBy: '김학사',
    startedAt: '2026-08-09T10:00:00',
    finishedAt: status[jobId] === 'RUNNING' ? null : '2026-08-09T10:02:00',
    durationSeconds: status[jobId] === 'RUNNING' ? null : 120,
    fetchedCourseCount: null,
    fetchedScheduleCount: null,
    createdCount: null,
    updatedCount: null,
    closedCount: null,
    warningCount: null,
    progress: status[jobId] === 'RUNNING' ? { phase: 'PERSIST', current: 10, total: 20 } : null,
    partiallyApplied: false,
    failureReason: null,
  });

  server.use(
    http.get('http://localhost:8080/api/v1/admin/courses/summary', () => {
      return HttpResponse.json({
        semester: { academicYear: 2026, term: 'FIRST' },
        courseCount: 1203,
        scheduleCount: 2847,
        lastJob: null,
        runningJobId,
      });
    }),
    // 두 번째 실행은 남의 Job 때문에 409/5200 이다. summary 는 폴링되지 않으므로
    // 이 재조회(04 §10-3)가 남의 RUNNING Job 을 클라이언트에 알리는 유일한 경로다.
    http.post('http://localhost:8080/api/v1/admin/sync/jobs', () => {
      postCalls += 1;
      if (postCalls === 1) {
        runningJobId = MINE;
        return HttpResponse.json({ jobId: MINE }, { status: 202 });
      }
      return HttpResponse.json(
        { code: 5200, message: '이미 업데이트가 진행 중이에요.' },
        { status: 409 },
      );
    }),
    http.get('http://localhost:8080/api/v1/admin/sync/jobs/:jobId', ({ params }) => {
      const jobId = Number(params.jobId);
      polled.push(String(jobId));
      return HttpResponse.json(jobBody(jobId));
    }),
  );

  const snapshots = await probe.renderSyncMainSteps([
    { wait: 700 },
    { click: '데이터 업데이트', wait: 400 },
    { click: '다음', wait: 700 },
    { click: '갱신', wait: 900 },
    {
      wait: 2600,
      before: () => {
        status[MINE] = 'SUCCESS';
        runningJobId = null;
      },
    },
    {
      wait: 400,
      before: () => {
        runningJobId = THEIRS;
      },
    },
    { click: '데이터 업데이트', wait: 400 },
    { click: '다음', wait: 700 },
    { click: '갱신', wait: 1200 },
    { wait: 2600 },
    {
      wait: 600,
      before: () => {
        status[THEIRS] = 'SUCCESS';
        runningJobId = null;
      },
    },
    { wait: 600 },
    { wait: 600 },
    { wait: 600 },
    { wait: 600 },
    { wait: 600 },
  ]);

  const afterMine = snapshots[4];
  const watchingTheirs = snapshots[9];
  const afterTheirs = snapshots[10];

  check('내 Job 을 폴링한다', polled.includes(String(MINE)), 'polled=' + polled);
  eq('내 Job 종료 토스트 1개', text(afterMine).match(/업데이트를 마쳤어요\./g)?.length, 1);

  check('남의 RUNNING Job 으로 넘어간다', polled.includes(String(THEIRS)), 'polled=' + polled);
  check('남의 Job 진행률이 뜬다', text(watchingTheirs).includes('적재 10/20건'));

  const running = snapshots.map((snapshot) => text(snapshot).includes('업데이트 진행 중'));
  check('남의 Job 이 도는 동안 진행 중으로 보인다', running.slice(8, 10).every(Boolean));
  check('남의 Job 이 끝나면 진행 중이 걷힌다', !running[10]);

  // 종료 effect 만 summary 를 콕 집어 무효화한다(409 의 onSettled 는 ['sync'] 프리픽스).
  // Job 이 둘이니 정확히 두 번. 끝난 Job 이 되살아나 재처리되면 세 번이 된다.
  const settleCount = invalidated.filter((key) => key === '["sync","summary"]').length;
  eq('종료 처리는 Job 당 한 번', settleCount, 2);

  queryClient.invalidateQueries = realInvalidate;

  server.resetHandlers();
  queryClient.clear();
}

section('폴링 갱신에는 트랜지션을 걸지 않는다 (DS-01 §4-3)');
{
  const job = seedRunningJob();
  const [snapshot] = await probe.renderSyncMainSteps([{ wait: 600 }]);

  const line = /<p class="([^"]*)"[^>]*>(?:(?!<\/p>)[\s\S])*?업데이트 진행 중/.exec(snapshot);
  check('진행률 줄을 찾았다', line !== null);
  check('transition 클래스 없음', line !== null && !line[1].includes('transition'), line?.[1]);
  check('duration 클래스 없음', line !== null && !/\bduration-/.test(line[1]));
  eq('progress 는 job 이 살아 있을 때만 읽는다', job.status, 'RUNNING');
}

await close();
export default result;

function updateButtonTag(html) {
  const pattern = /<button[^>]*>(?:(?!<\/button>)[\s\S])*?데이터 업데이트\s*<\/button>/;
  const element = pattern.exec(html)?.[0];
  return element === undefined ? '' : (/<button[^>]*>/.exec(element)?.[0] ?? '');
}
