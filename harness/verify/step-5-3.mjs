/** step-5-3:M3_M4_execute — POST /sync/jobs 202 · 409 2종 · 409 아닌 실패의 모달 처리. */
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

const JOBS_URL = 'http://localhost:8080/api/v1/admin/sync/jobs';

const fresh = () => {
  mockDb.reset();
  queryClient.clear();
};

await login({ loginId: 'haksa01', password: 'uss1234!' }).then((token) =>
  tokenManager.set(token.accessToken, token.name),
);

section('실행 — POST /sync/jobs 202 (03 §6-2 · D4)');
{
  fresh();
  const sent = [];
  server.use(
    http.post(JOBS_URL, async ({ request }) => {
      const body = await request.json();
      sent.push(body);
      const job = mockDb.createJob(
        { academicYear: body.academicYear, term: body.term },
        body.expectedStrategy,
        '김학사',
      );
      return HttpResponse.json({ jobId: job.jobId }, { status: 202 });
    }),
  );

  const { afterAction } = await probe.runSyncConfirmFlow({ actionLabel: '갱신' });

  eq('요청 1회', sent.length, 1);
  eq('요청 바디', sent[0], {
    academicYear: 2026,
    term: 'FIRST',
    expectedStrategy: 'UPSERT',
  });
  check('모달이 닫힌다', !text(afterAction).includes('데이터를 갱신할까요?'));
  check('카드가 진행 중으로 바뀐다', text(afterAction).includes('진행 중'));

  server.resetHandlers();
}

section('409 / 5200 — 이미 실행 중 (03 §6-2 · 01 §9-1)');
{
  fresh();
  let calls = 0;
  server.use(
    http.post(JOBS_URL, () => {
      calls += 1;
      return HttpResponse.json(
        { code: 5200, message: '이미 업데이트가 진행 중이에요.' },
        { status: 409 },
      );
    }),
  );

  const { afterAction } = await probe.runSyncConfirmFlow({ actionLabel: '갱신' });
  const body = text(afterAction);

  eq('자동 재시도 없음', calls, 1);
  check('모달이 닫힌다', !body.includes('데이터를 갱신할까요?'));
  check('토스트 문구', body.includes('이미 업데이트가 진행 중이에요.'));
  eq('토스트는 한 번만', body.match(/이미 업데이트가 진행 중이에요\./g)?.length, 1);

  server.resetHandlers();
}

section('409 / 5201 — 전략 불일치 (03 §6-2 · 01 §9-1)');
{
  fresh();
  let calls = 0;
  server.use(
    http.post(JOBS_URL, () => {
      calls += 1;
      return HttpResponse.json(
        { code: 5201, message: '데이터가 변경됐어요. 다시 확인해주세요.' },
        { status: 409 },
      );
    }),
  );

  const { afterAction } = await probe.runSyncConfirmFlow({
    termLabel: '여름계절학기',
    confirmText: '2026-여름계절학기',
    actionLabel: '삭제 후 적재',
  });
  const body = text(afterAction);

  eq('자동 재시도 없음', calls, 1);
  check('모달이 닫힌다', !body.includes('기존 데이터를 모두 삭제합니다'));
  check('토스트 문구', body.includes('데이터가 변경됐어요. 다시 확인해주세요.'));

  server.resetHandlers();
}

section('409 가 아닌 실패는 모달을 닫지 않는다');
{
  fresh();
  server.use(
    http.post(JOBS_URL, () =>
      HttpResponse.json({ code: 9999, message: '서버 오류' }, { status: 500 }),
    ),
  );

  const { afterAction } = await probe.runSyncConfirmFlow({ actionLabel: '갱신' });
  const body = text(afterAction);
  check('모달은 열려 있다', body.includes('데이터를 갱신할까요?'));
  check('토스트로 알린다', body.includes('서버에 문제가 생겼어요.'));

  server.resetHandlers();
}

await close();
export default result;
