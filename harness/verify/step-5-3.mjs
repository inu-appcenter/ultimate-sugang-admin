/** step-5-3:M3_M4_execute — 확인 모달 3종 + POST /sync/jobs + 409 2종. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

const buttonTag = (html, label) => {
  const pattern = new RegExp(`<button[^>]*>(?:(?!</button>)[\\s\\S])*?${label}\\s*</button>`);
  const element = pattern.exec(html)?.[0];
  return element === undefined ? '' : (/<button[^>]*>/.exec(element)?.[0] ?? '');
};
const isDisabled = (tag) => /\sdisabled(?:=|\s|$)/.test(tag);

const JOBS_URL = 'http://localhost:8080/api/v1/admin/sync/jobs';

const fresh = () => {
  mockDb.reset();
  queryClient.clear();
};

await login({ loginId: 'haksa01', password: 'uss1234!' }).then((token) =>
  tokenManager.set(token.accessToken, token.name),
);

section('destructive 는 진한 빨강 면이다 (사용자 결정 2026-08-09)');
{
  // 연분홍(danger-bg) 면으로 되돌리면 M4 가 M3 의 파란 [갱신]보다 약해 보인다.
  const globals = readFileSync(join(process.cwd(), 'src/shared/styles/globals.css'), 'utf8');
  check('--destructive 는 danger-text', /--destructive:\s*var\(--danger-text\)/.test(globals));
  check(
    '--destructive-foreground 는 흰색',
    /--destructive-foreground:\s*var\(--primary-foreground\)/.test(globals),
  );
  check('danger-bg 면으로 되돌아가지 않았다', !/--destructive:\s*var\(--danger-bg\)/.test(globals));
}

section('UPSERT → M3 (01 §7-3)');
{
  fresh();
  const { confirmDialog } = await probe.runSyncConfirmFlow();
  const body = text(confirmDialog);

  check('제목', body.includes('데이터를 갱신할까요?'));
  check('본문', body.includes('2026학년도 1학기 데이터를 최신 상태로 갱신할게요.'));
  check('· 새로 생긴 과목은 추가돼요.', body.includes('새로 생긴 과목은 추가돼요.'));
  check('· 바뀐 과목은 수정돼요.', body.includes('바뀐 과목은 수정돼요.'));
  check('· 사라진 과목은 폐강 처리돼요.', body.includes('사라진 과목은 폐강 처리돼요.'));
  check('· 장바구니·수강신청은 그대로예요.', body.includes('장바구니·수강신청은 그대로예요.'));
  check('[취소]', body.includes('취소'));
  check('[갱신]', body.includes('갱신'));
  check('폭 400px', !confirmDialog.includes('max-w-modal-wide'));
  check('destructive 가 아니다', !confirmDialog.includes('bg-destructive'));
  check('Strict Match 입력이 없다', !confirmDialog.includes('sync-replace-confirm'));
}

section('INITIAL → M3 변형 (01 §7-5)');
{
  fresh();
  mockDb.state.loadedSemester = null;
  mockDb.state.courseCount = 0;
  mockDb.state.scheduleCount = 0;

  const { confirmDialog } = await probe.runSyncConfirmFlow();
  const body = text(confirmDialog);

  check('제목', body.includes('데이터를 적재할까요?'));
  check('본문', body.includes('데이터를 새로 적재할게요.'));
  check('[적재]', body.includes('적재'));
  check('UPSERT 안내 4줄이 없다', !body.includes('사라진 과목은 폐강 처리돼요.'));
  check('destructive 가 아니다', !confirmDialog.includes('bg-destructive'));
}

section('REPLACE → M4 (01 §7-4 · DS-00 §6 격식체)');
{
  fresh();
  const { confirmDialog } = await probe.runSyncConfirmFlow({ termLabel: '여름계절학기' });
  const body = text(confirmDialog);

  check('제목', body.includes('기존 데이터를 모두 삭제합니다'));
  check('현재 학기', body.includes('현재') && body.includes('2026학년도 1학기'));
  check('변경 학기', body.includes('변경') && body.includes('2026학년도 여름계절학기'));
  check('삭제 안내', body.includes('다음 데이터가 영구 삭제됩니다.'));
  check('강의 건수', body.includes('강의') && body.includes('1,203건'));
  check('시간표 건수', body.includes('2,847건'));
  check('장바구니 건수', body.includes('87건'));
  check('수강신청 건수', body.includes('41건'));
  check('비가역 경고', body.includes('이 작업은 되돌릴 수 없습니다.'));
  check('입력 안내', body.includes('확인을 위해 아래를 입력하세요'));
  check('기대 문자열', body.includes('2026-여름계절학기'));

  check('폭 480px', confirmDialog.includes('max-w-modal-wide'));
  check('실행 버튼 destructive', buttonTag(confirmDialog, '삭제 후 적재').includes('bg-destructive'));
  check('입력 전에는 비활성', isDisabled(buttonTag(confirmDialog, '삭제 후 적재')));
  check('입력창 font-mono', /<input[^>]*font-mono/.test(confirmDialog));

  check('격식체를 지킨다', body.includes('삭제합니다') && body.includes('없습니다'));
  check('구어체로 바꾸지 않았다', !body.includes('삭제할까요') && !body.includes('없어요'));
}

section('M4 Strict Match (04 §10-3)');
{
  fresh();
  const wrong = await probe.runSyncConfirmFlow({
    termLabel: '여름계절학기',
    confirmText: '2026-여름계절',
  });
  check('부분 일치는 비활성', isDisabled(buttonTag(wrong.typed, '삭제 후 적재')));

  fresh();
  const spaced = await probe.runSyncConfirmFlow({
    termLabel: '여름계절학기',
    confirmText: '2026-여름계절학기 ',
  });
  check('뒤 공백도 비활성', isDisabled(buttonTag(spaced.typed, '삭제 후 적재')));

  fresh();
  const exact = await probe.runSyncConfirmFlow({
    termLabel: '여름계절학기',
    confirmText: '2026-여름계절학기',
  });
  check('정확 일치면 활성', !isDisabled(buttonTag(exact.typed, '삭제 후 적재')));
}

section('M4 를 닫으면 입력값을 지운다 (01 §7-4)');
{
  fresh();
  const { reopened, reopenedInput } = await probe.runSyncConfirmFlow({
    termLabel: '여름계절학기',
    confirmText: '2026-여름계절학기',
    reopen: true,
  });
  check('다시 열면 실행 버튼이 다시 비활성', isDisabled(buttonTag(reopened, '삭제 후 적재')));
  eq('입력값이 비어 있다', reopenedInput, '');
}

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
