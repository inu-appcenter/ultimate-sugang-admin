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

/** 진행률 줄(SyncProgressText)만 뽑는다. 카드의 다른 문구가 섞이면 문구를 정확히 못 센다. */
function progressLine(html) {
  const found = /<p class="([^"]*text-warning-text[^"]*)"[^>]*>([\s\S]*?)<\/p>/.exec(html);
  return found === null ? null : { className: found[1], text: text(found[2]).trim() };
}

/** sonner 토스트만 센다. 같은 문구가 카드 Error State 에도 있어 전체 DOM 으로는 2개로 잡힌다. */
function toastCount(html, message) {
  const toasts = html.match(/<li[^>]*data-sonner-toast[\s\S]*?<\/li>/g) ?? [];
  return toasts.filter((node) => text(node).includes(message)).length;
}

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
    progress: { phase: 'COURSE_FETCH' },
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
    { wait: 200 },
    {
      wait: 400,
      before: () => {
        job.progress = { phase: 'TIMETABLE_FETCH' };
      },
    },
    {
      wait: 400,
      before: () => {
        job.progress = { phase: 'PERSIST' };
      },
    },
    {
      wait: 400,
      before: () => finish(job, 'SUCCESS'),
    },
  ]);

  check('실행 없이 폴링이 붙는다', progressLine(first) !== null);
  eq('단계만 보여준다', progressLine(first)?.text, '업데이트 진행 중 · 강의 수집');
  eq('단계가 바뀌면 문구도 바뀐다', progressLine(fetching)?.text, '업데이트 진행 중 · 시간표 수집');
  eq('적재 단계', progressLine(persisting)?.text, '업데이트 진행 중 · 적재');
  // 수치를 되살리면 여기서 걸린다. 진행률에 숫자를 넣지 않는다.
  check('숫자가 섞이지 않는다', !/\d/.test(progressLine(persisting)?.text ?? ''));

  eq('종료되면 진행률이 사라진다', progressLine(finished), null);
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
    { wait: 400 },
    {
      wait: 400,
      before: () => finish(job, 'SUCCESS'),
    },
    {
      wait: 400,
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
    { wait: 200 },
    { wait: 400, before: () => finish(job, 'FAILED') },
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
        progress: { phase: 'TIMETABLE_FETCH' },
        partiallyApplied: false,
        failureReason: null,
      });
    }),
  );

  const { afterAction } = await probe.runSyncConfirmFlow({ actionLabel: '갱신', settleMs: 200 });
  check('summary 가 몰라도 폴링이 시작된다', polls >= 1, `polls=${polls}`);

  // 이 케이스의 summary 는 끝까지 runningJobId 를 null 로 준다. 실행 버튼의 잠금이
  // summary 에만 달려 있으면 202 를 받은 뒤에도 다시 눌러진다 (01 §8-2).
  check('202 직후 버튼이 잠긴다', /\sdisabled(?:=|\s|$)/.test(updateButtonTag(afterAction)));
  check('진행률 줄도 같이 뜬다', progressLine(afterAction) !== null);

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
    progress: status[jobId] === 'RUNNING' ? { phase: 'PERSIST' } : null,
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
    { wait: 200 },
    { click: '데이터 업데이트', wait: 200 },
    { click: '다음', wait: 200 },
    { click: '갱신', wait: 200 },
    {
      wait: 400,
      before: () => {
        status[MINE] = 'SUCCESS';
        runningJobId = null;
      },
    },
    {
      wait: 200,
      before: () => {
        runningJobId = THEIRS;
      },
    },
    { click: '데이터 업데이트', wait: 200 },
    { click: '다음', wait: 200 },
    { click: '갱신', wait: 200 },
    { wait: 400 },
    {
      wait: 200,
      before: () => {
        status[THEIRS] = 'SUCCESS';
        runningJobId = null;
      },
    },
    { wait: 200 },
    { wait: 200 },
    { wait: 200 },
    { wait: 200 },
    { wait: 200 },
  ]);

  const afterMine = snapshots[4];
  const watchingTheirs = snapshots[9];
  const afterTheirs = snapshots[10];

  check('내 Job 을 폴링한다', polled.includes(String(MINE)), 'polled=' + polled);
  eq('내 Job 종료 토스트 1개', text(afterMine).match(/업데이트를 마쳤어요\./g)?.length, 1);

  check('남의 RUNNING Job 으로 넘어간다', polled.includes(String(THEIRS)), 'polled=' + polled);
  check('남의 Job 진행률이 뜬다', text(watchingTheirs).includes('업데이트 진행 중 · 적재'));

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

section('폴링 실패는 조용히, 나머지 쿼리는 그대로 (04 §9-2)');
{
  // 폴링은 2초마다 돈다. 실패할 때마다 전역 토스트를 띄우면 같은 문구가 화면에 쌓인다.
  const job = seedRunningJob();
  let polls = 0;
  server.use(
    http.get(`http://localhost:8080/api/v1/admin/sync/jobs/${RUNNING_JOB_ID}`, () => {
      polls += 1;
      if (polls === 1) return HttpResponse.json(job);
      return HttpResponse.json({ code: 5000, message: '폴링이 끊겼어요.' }, { status: 500 });
    }),
  );

  const [, dead] = await probe.renderSyncMainSteps([{ wait: 200 }, { wait: 400 }]);

  check('첫 응답 뒤로는 계속 실패시켰다', polls >= 2, `polls=${polls}`);
  eq('폴링 에러 토스트가 없다', toastCount(dead, '폴링이 끊겼어요.'), 0);
  eq('마지막 성공 응답을 유지한다', progressLine(dead)?.text, '업데이트 진행 중 · 강의 수집');

  server.resetHandlers();
  queryClient.clear();

  // 예외는 폴링 쿼리 하나다. 현황 조회가 죽으면 04 §9-2 대로 토스트가 뜬다.
  mockDb.reset();
  server.use(
    http.get('http://localhost:8080/api/v1/admin/courses/summary', () =>
      HttpResponse.json({ code: 5000, message: '현황을 불러오지 못했어요.' }, { status: 500 }),
    ),
  );

  // 이 대기는 폴링이 아니라 queries.retry=1 의 재시도 지연(약 1초)을 기다린다.
  const [broken] = await probe.renderSyncMainSteps([{ wait: 3000 }]);
  eq('현황 조회 실패는 토스트 1개', toastCount(broken, '현황을 불러오지 못했어요.'), 1);

  server.resetHandlers();
  queryClient.clear();
}

section('폴링 갱신에는 트랜지션을 걸지 않는다 (DS-01 §4-3)');
{
  const job = seedRunningJob();
  const [snapshot] = await probe.renderSyncMainSteps([{ wait: 200 }]);

  const line = progressLine(snapshot);
  check('진행률 줄을 찾았다', line !== null);
  check('transition 클래스 없음', line !== null && !line.className.includes('transition'), line?.className);
  check('duration 클래스 없음', line !== null && !/\bduration-/.test(line.className));
  eq('progress 는 job 이 살아 있을 때만 읽는다', job.status, 'RUNNING');
}

await close();
export default result;

function updateButtonTag(html) {
  const pattern = /<button[^>]*>(?:(?!<\/button>)[\s\S])*?데이터 업데이트\s*<\/button>/;
  const element = pattern.exec(html)?.[0];
  return element === undefined ? '' : (/<button[^>]*>/.exec(element)?.[0] ?? '');
}
