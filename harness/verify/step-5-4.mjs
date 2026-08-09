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

section('끝난 Job 이 남의 RUNNING Job 을 가리지 않는다 (04 §10-4)');
{
  // 내 Job 이 끝난 뒤 다른 관리자가 돌린 Job 을 summary 가 알려주면 그쪽으로 넘어가야 한다.
  mockDb.reset();
  queryClient.clear();
  const mine = 41;
  const theirs = 77;
  let runningJobId = null;
  const polled = [];

  server.use(
    http.get('http://localhost:8080/api/v1/admin/courses/summary', () =>
      HttpResponse.json({
        semester: { academicYear: 2026, term: 'FIRST' },
        courseCount: 1203,
        scheduleCount: 2847,
        lastJob: null,
        runningJobId,
      }),
    ),
    http.post('http://localhost:8080/api/v1/admin/sync/jobs', () =>
      HttpResponse.json({ jobId: mine }, { status: 202 }),
    ),
    http.get('http://localhost:8080/api/v1/admin/sync/jobs/:jobId', ({ params }) => {
      const jobId = Number(params.jobId);
      polled.push(jobId);
      return HttpResponse.json({
        jobId,
        academicYear: 2026,
        term: 'FIRST',
        strategy: 'UPSERT',
        status: jobId === mine ? 'SUCCESS' : 'RUNNING',
        executedBy: '김학사',
        startedAt: '2026-08-09T10:00:00',
        finishedAt: jobId === mine ? '2026-08-09T10:02:00' : null,
        durationSeconds: jobId === mine ? 120 : null,
        fetchedCourseCount: null,
        fetchedScheduleCount: null,
        createdCount: null,
        updatedCount: null,
        closedCount: null,
        warningCount: null,
        progress: jobId === mine ? null : { phase: 'PERSIST', current: 10, total: 20 },
        partiallyApplied: false,
        failureReason: null,
      });
    }),
  );

  await probe.runSyncConfirmFlow({ actionLabel: '갱신', settleMs: 600 });
  check('내 Job 을 먼저 폴링한다', polled.includes(mine), `polled=${polled}`);

  runningJobId = theirs;
  queryClient.clear();
  const [snapshot] = await probe.renderSyncMainSteps([{ wait: 800 }]);

  check('남의 RUNNING Job 으로 넘어간다', polled.includes(theirs), `polled=${polled}`);
  check('진행률이 단계까지 나온다', text(snapshot).includes('적재 10/20건'));

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
