/** step-5-2:M2_preflight — 학기 선택 모달 + 전략 판정. 계약·3전략·D4·초기값 폴백. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { delay, http, HttpResponse } from 'msw';

import { createChecker, createRuntime, installDom } from './env.mjs';

installDom();
const { load, server, close } = await createRuntime();

const { mockDb } = await load('/src/mocks/db.ts');
const { tokenManager } = await load('/src/shared/api/tokenManager.ts');
const { installRefreshInterceptor } = await load('/src/shared/api/refreshQueue.ts');
const { login } = await load('/src/features/auth/api.ts');
const { queryClient } = await load('/src/shared/api/queryClient.ts');
const { fetchCoursesSummary, requestSyncPreflight } = await load('/src/features/sync/api.ts');
const probe = await load('/harness/verify/probe.tsx');

installRefreshInterceptor();

const { result, check, eq, section } = createChecker();

const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

const nextButtonTag = (html) => {
  const element = /<button[^>]*>(?:(?!<\/button>)[\s\S])*?다음\s*<\/button>/.exec(html)?.[0];
  return element === undefined ? '' : (/<button[^>]*>/.exec(element)?.[0] ?? '');
};
const isDisabled = (tag) => /\sdisabled(?:=|\s|$)/.test(tag);

const PREFLIGHT_URL = 'http://localhost:8080/api/v1/admin/sync/preflight';
const ZERO_COUNTS = { courses: 0, schedules: 0, carts: 0, registrations: 0 };

await login({ loginId: 'haksa01', password: 'uss1234!' }).then((token) =>
  tokenManager.set(token.accessToken, token.name),
);

section('전략 판정 3종 — 서버가 정한다 (03 §6-1 · D4)');
{
  mockDb.reset();
  const upsert = await requestSyncPreflight({ academicYear: 2026, term: 'FIRST' });
  eq('적재 학기 == 대상 → UPSERT', upsert.strategy, 'UPSERT');
  eq('UPSERT 는 삭제 0', upsert.deleteCounts, ZERO_COUNTS);
  eq('currentSemester', upsert.currentSemester, { academicYear: 2026, term: 'FIRST' });
  eq('targetSemester', upsert.targetSemester, { academicYear: 2026, term: 'FIRST' });

  const replace = await requestSyncPreflight({ academicYear: 2026, term: 'SUMMER' });
  eq('적재 학기 != 대상 → REPLACE', replace.strategy, 'REPLACE');
  eq('REPLACE 는 실제 삭제 건수', replace.deleteCounts, {
    courses: 1203,
    schedules: 2847,
    carts: 87,
    registrations: 41,
  });

  mockDb.state.loadedSemester = null;
  const initial = await requestSyncPreflight({ academicYear: 2026, term: 'FIRST' });
  eq('DB 비었으면 INITIAL', initial.strategy, 'INITIAL');
  eq('INITIAL 은 currentSemester null', initial.currentSemester, null);
  eq('INITIAL 은 삭제 0', initial.deleteCounts, ZERO_COUNTS);
}

section('preflight 는 DB 를 바꾸지 않는다 (03 §6-1)');
{
  mockDb.reset();
  const before = await fetchCoursesSummary();
  await requestSyncPreflight({ academicYear: 2027, term: 'WINTER' });
  eq('summary 그대로', await fetchCoursesSummary(), before);
}

section('D4 — 클라이언트가 전략을 계산하지 않는다');
{
  // 전략 리터럴로 분기하는 코드가 features/pages 에 있으면 판정을 흉내 낸 것이다.
  const decide = /(?:===|!==|\?|:)\s*['"](INITIAL|UPSERT|REPLACE)['"]/;
  const offenders = [];

  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(name)) continue;
      if (decide.test(readFileSync(path, 'utf8'))) offenders.push(path.replace(process.cwd(), ''));
    }
  };
  walk(join(process.cwd(), 'src/features'));
  walk(join(process.cwd(), 'src/pages'));

  eq('전략 리터럴로 분기하는 파일', offenders, []);
}

section('M2 마크업 — [데이터 업데이트] 로 연다 (01 §7-2)');
{
  mockDb.reset();
  queryClient.clear();
  const { opened, openedDialog, afterNext } = await probe.openSyncTargetModal();
  const body = text(opened);

  check('제목', body.includes('데이터 업데이트'));
  check('안내', body.includes('적재할 학기를 골라주세요.'));
  check('연도 라벨', body.includes('연도'));
  check('학기 라벨', body.includes('학기'));
  check('초기값 = 현재 적재 학기', body.includes('2026') && body.includes('1학기'));
  check('현재 적재 행', body.includes('현재 적재') && body.includes('2026학년도 1학기'));
  check('[취소]', body.includes('취소'));
  check('[다음]', body.includes('다음'));
  check('[다음] 은 처음부터 활성', !isDisabled(nextButtonTag(openedDialog)));

  check('폭 400px', opened.includes('max-w-modal') && !opened.includes('max-w-modal-wide'));
  check('모션 200ms 를 variant 로 건다', opened.includes('data-[state=open]:duration-200'));
  check('다크·반응형 클래스 없음', !/\bdark:|["'\s:](sm|md|lg|xl):[a-z[]/.test(opened));
  check('raw hex 없음', !/#[0-9a-fA-F]{6}\b/.test(opened));

  check('판정에 성공하면 닫힌다', !text(afterNext).includes('적재할 학기를 골라주세요.'));
  queryClient.clear();
}

section('초기값 폴백 — 적재 데이터가 없으면 표시 학기 (01 §7-2)');
{
  mockDb.reset();
  mockDb.state.loadedSemester = null;
  mockDb.state.courseCount = 0;
  mockDb.state.scheduleCount = 0;
  queryClient.clear();

  const { opened } = await probe.openSyncTargetModal();
  const body = text(opened);
  check('표시 학기(2026 2학기)로 연다', body.includes('2026') && body.includes('2학기'));
  check('현재 적재 행은 숨긴다', !body.includes('현재 적재'));
  queryClient.clear();
}

section('판정 중 — [다음] 비활성 + spinner (01 §7-2)');
{
  mockDb.reset();
  queryClient.clear();
  server.use(
    http.post(PREFLIGHT_URL, async ({ request }) => {
      await delay(150);
      const target = await request.json();
      return HttpResponse.json({
        strategy: mockDb.decideStrategy(target),
        currentSemester: mockDb.state.loadedSemester,
        targetSemester: target,
        deleteCounts: mockDb.deleteCounts(mockDb.decideStrategy(target)),
      });
    }),
  );

  const { judgingDialog, afterNext } = await probe.openSyncTargetModal({ settleMs: 400 });
  check('판정 중 [다음] 비활성', isDisabled(nextButtonTag(judgingDialog)));
  check('판정 중 spinner', /animate-spin/.test(judgingDialog));
  check('판정이 끝나면 닫힌다', !text(afterNext).includes('적재할 학기를 골라주세요.'));

  server.resetHandlers();
  queryClient.clear();
}

section('판정 실패 — 토스트 + 모달 유지 (04 §9-2)');
{
  mockDb.reset();
  queryClient.clear();
  server.use(
    http.post(PREFLIGHT_URL, () =>
      HttpResponse.json({ code: 8888, message: '처리할 수 없는 값이 있어요.' }, { status: 400 }),
    ),
  );

  const { afterNext } = await probe.openSyncTargetModal();
  const body = text(afterNext);
  check('토스트로 알린다', body.includes('처리할 수 없는 값이 있어요.'));
  check('모달은 열린 채로 둔다', body.includes('적재할 학기를 골라주세요.'));

  server.resetHandlers();
  queryClient.clear();
}

await close();
export default result;
