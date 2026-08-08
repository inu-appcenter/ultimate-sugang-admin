import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import { env } from '@/env';
import { MOCK_ADMIN, mockDb, type JobRecord } from '@/mocks/db';
import { ERROR_CODE } from '@/shared/constants/errorCodes';

/**
 * 9개 엔드포인트 mock (04 §11). `03` 계약과 1:1 이다.
 * 여기 없는 엔드포인트는 만들지 않는다 — 실서버로 바꾸면 존재하지 않는 것들이다.
 */
const base = (path: string) => `${env.VITE_API_HOST}/api/v1/admin${path}`;

/** MSW 경로 파라미터. 문자열을 직접 박으면 계약 린트가 9개 목록과 대조하지 못한다. */
const JOB_ID = ':jobId';

/** 03 §2-4 — 서버 고정값이다. size 파라미터가 없다. */
const PAGE_SIZE = 10;

const termSchema = z.enum(['FIRST', 'SECOND', 'SUMMER', 'WINTER']);
const strategySchema = z.enum(['INITIAL', 'UPSERT', 'REPLACE']);
const changeTypeSchema = z.enum(['CREATED', 'UPDATED', 'CLOSED', 'WARNING']);
const semesterBodySchema = z.object({ academicYear: z.number().int(), term: termSchema });

const fail = (status: number, code: number, message: string) =>
  HttpResponse.json({ code, message }, { status });

const paginate = <T>(items: T[], page: number) => {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  return {
    page,
    totalPages,
    hasNextPage: page < totalPages,
    content: items.slice(start, start + PAGE_SIZE),
  };
};

const readPage = (url: URL) => {
  const raw = url.searchParams.get('page');
  const parsed = raw === null ? 1 : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
};

/** 인증 헤더는 `access-token` 이다 (03 §2-2). 미통과 코드는 1000번대를 재사용한다. */
function requireAdmin(request: Request): Response | null {
  const token = request.headers.get('access-token');
  if (token === null || token.length === 0) {
    return fail(401, ERROR_CODE.MISSING_ACCESS_TOKEN, '로그인이 필요합니다.');
  }
  if (!mockDb.isValidToken(token)) {
    return fail(401, ERROR_CODE.EXPIRED_ACCESS_TOKEN, '토큰이 만료되었습니다.');
  }
  return null;
}

/** 이력 목록 행 (03 §6-3) — 상세와 달리 executedBy·progress 를 포함하지 않는다. */
const toJobListItem = (job: JobRecord) => ({
  jobId: job.jobId,
  academicYear: job.academicYear,
  term: job.term,
  strategy: job.strategy,
  status: job.status,
  startedAt: job.startedAt,
  createdCount: job.createdCount,
  updatedCount: job.updatedCount,
  closedCount: job.closedCount,
});

export const handlers = [
  // ── 인증 ────────────────────────────────────────────────────
  http.post(base('/auth/login'), async ({ request }) => {
    const body = z
      .object({ loginId: z.string(), password: z.string() })
      .safeParse(await request.json());
    if (!body.success) return fail(400, ERROR_CODE.INVALID_REQUEST_PARAMETER, '잘못된 요청입니다.');

    const ok =
      body.data.loginId === MOCK_ADMIN.loginId && body.data.password === MOCK_ADMIN.password;
    // 아이디 없음과 비밀번호 불일치를 구분하지 않는다 (03 §3-1).
    if (!ok) return fail(401, ERROR_CODE.ADMIN_LOGIN_FAILED, '아이디나 비밀번호가 맞지 않아요.');

    return HttpResponse.json({ accessToken: mockDb.issueToken(), name: MOCK_ADMIN.name });
  }),

  // 만료 여부를 검사하지 않는다. 서명만 유효하면 재발급한다 (03 §3-2).
  http.post(base('/auth/refresh'), ({ request }) => {
    const token = request.headers.get('access-token');
    if (token === null || token.length === 0) {
      return fail(401, ERROR_CODE.MISSING_ACCESS_TOKEN, '로그인이 필요합니다.');
    }
    if (mockDb.state.refreshBlocked) {
      return fail(401, ERROR_CODE.INVALID_SIGNATURE_ACCESS_TOKEN, '토큰 서명이 올바르지 않습니다.');
    }
    return HttpResponse.json({ accessToken: mockDb.issueToken(), name: MOCK_ADMIN.name });
  }),

  // ── 표시 학기 (D10 — 적재 데이터를 건드리지 않는다) ────────────
  http.get(base('/semesters/display'), ({ request }) => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const semester = mockDb.state.displaySemester;
    if (semester === null) {
      return fail(404, ERROR_CODE.SEMESTER_SETTING_NOT_FOUND, '표시 학기 설정이 없습니다.');
    }
    return HttpResponse.json(semester);
  }),

  http.put(base('/semesters/display'), async ({ request }) => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const body = semesterBodySchema.safeParse(await request.json());
    if (!body.success) return fail(400, ERROR_CODE.INVALID_ENUM_TYPE, '처리할 수 없는 값이 있어요.');

    mockDb.state.displaySemester = body.data;
    return HttpResponse.json(body.data);
  }),

  // ── 적재 현황 ────────────────────────────────────────────────
  http.get(base('/courses/summary'), ({ request }) => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const { loadedSemester, courseCount, scheduleCount, jobs } = mockDb.state;
    const [latest] = jobs;
    const running = mockDb.findRunningJob();

    return HttpResponse.json({
      semester: loadedSemester,
      courseCount,
      scheduleCount,
      lastJob:
        latest === undefined
          ? null
          : {
              jobId: latest.jobId,
              status: latest.status,
              startedAt: latest.startedAt,
              createdCount: latest.createdCount,
              updatedCount: latest.updatedCount,
              closedCount: latest.closedCount,
            },
      runningJobId: running === undefined ? null : running.jobId,
    });
  }),

  // ── 데이터 업데이트 ──────────────────────────────────────────
  // 전략은 서버가 판정한다 (D4). DB 를 변경하지 않는다.
  http.post(base('/sync/preflight'), async ({ request }) => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const body = semesterBodySchema.safeParse(await request.json());
    if (!body.success) return fail(400, ERROR_CODE.INVALID_ENUM_TYPE, '처리할 수 없는 값이 있어요.');

    const strategy = mockDb.decideStrategy(body.data);
    return HttpResponse.json({
      strategy,
      currentSemester: strategy === 'INITIAL' ? null : mockDb.state.loadedSemester,
      targetSemester: body.data,
      deleteCounts: mockDb.deleteCounts(strategy),
    });
  }),

  http.post(base('/sync/jobs'), async ({ request }) => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const body = semesterBodySchema
      .extend({ expectedStrategy: strategySchema })
      .safeParse(await request.json());
    if (!body.success) return fail(400, ERROR_CODE.INVALID_ENUM_TYPE, '처리할 수 없는 값이 있어요.');

    // 1) RUNNING Job 이 있으면 거부한다.
    if (mockDb.findRunningJob() !== undefined) {
      return fail(409, ERROR_CODE.SYNC_JOB_ALREADY_RUNNING, '이미 업데이트가 진행 중이에요.');
    }
    // 2~3) 재판정 결과가 관리자가 본 것과 다르면 거부한다. 자동 재시도 대상이 아니다.
    const target = { academicYear: body.data.academicYear, term: body.data.term };
    const actual = mockDb.decideStrategy(target);
    if (actual !== body.data.expectedStrategy) {
      return fail(409, ERROR_CODE.SYNC_STRATEGY_MISMATCH, '데이터가 변경됐어요. 다시 확인해주세요.');
    }

    const job = mockDb.createJob(target, actual, MOCK_ADMIN.name);
    return HttpResponse.json({ jobId: job.jobId }, { status: 202 });
  }),

  // startedAt 내림차순, 10행 고정 (03 §6-3).
  http.get(base('/sync/jobs'), ({ request }) => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const page = readPage(new URL(request.url));
    return HttpResponse.json(paginate(mockDb.state.jobs.map(toJobListItem), page));
  }),

  // 인라인 확장과 진행률 폴링을 겸한다 (03 §6-4).
  http.get(base(`/sync/jobs/${JOB_ID}`), ({ request, params }) => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const job = mockDb.findJob(Number(params.jobId));
    if (job === undefined) return fail(404, ERROR_CODE.SYNC_JOB_NOT_FOUND, '해당 작업이 없습니다.');
    return HttpResponse.json(job);
  }),

  http.get(base(`/sync/jobs/${JOB_ID}/details`), ({ request, params }) => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const job = mockDb.findJob(Number(params.jobId));
    if (job === undefined) return fail(404, ERROR_CODE.SYNC_JOB_NOT_FOUND, '해당 작업이 없습니다.');

    const url = new URL(request.url);
    const changeType = changeTypeSchema.safeParse(url.searchParams.get('changeType'));
    if (!changeType.success) {
      return fail(400, ERROR_CODE.INVALID_REQUEST_PARAMETER, '입력값을 다시 확인해주세요.');
    }

    const rows = mockDb.detailsOf(job.jobId, changeType.data).map((detail) => ({
      haksuCode: detail.haksuCode,
      courseName: detail.courseName,
      changedFields: detail.changedFields,
      reason: detail.reason,
    }));
    return HttpResponse.json(paginate(rows, readPage(url)));
  }),
];
