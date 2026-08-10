/** step-5-2:M2_preflight — 학기 선택 모달 + 전략 판정. 계약·3전략·D4·초기값 폴백. */
import { delay, http, HttpResponse } from 'msw';

import { D4_PRODUCES } from '../../.claude/hooks/checks/d4-strategy.mjs';
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

const buttonTag = (html, label) => {
  const pattern = new RegExp(`<button[^>]*>(?:(?!</button>)[\\s\\S])*?${label}\\s*</button>`);
  const element = pattern.exec(html)?.[0];
  return element === undefined ? '' : (/<button[^>]*>/.exec(element)?.[0] ?? '');
};
// class 에 Tailwind 의 `disabled:` 변형이 들어 있어서 속성 자리인지까지 봐야 한다.
const isDisabled = (tag) => /\sdisabled(?:=|\s|$)/.test(tag);
const nextButtonTag = (html) => buttonTag(html, '다음');
const updateButtonTag = (html) => buttonTag(html, '데이터 업데이트');

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

section('D4 가드가 진짜 잡는지 (03 §6-1 · decisions D4 · rules/verification.md §2)');
{
  // 실제 소스 검사는 uss-contract-lint 의 `d4-strategy` 규칙이 fast 게이트에서 한다.
  // 여기서는 그 규칙이 잡아야 할 것과 통과시켜야 할 것을 고정한다 — 규칙이 헛돌면 여기서 red 가 난다.
  const produces = D4_PRODUCES;
  check(
    '가드가 대입을 잡는다',
    produces.some((rule) => rule.test("const strategy = 'REPLACE';")),
  );
  check(
    '가드가 expectedStrategy 하드코딩을 잡는다',
    produces.some((rule) => rule.test("{ expectedStrategy: 'UPSERT' }")),
  );
  check(
    '가드가 삼항 alternate 를 잡는다',
    produces.some((rule) => rule.test("const s = cond ? compute() : 'REPLACE';")),
  );
  check(
    '가드가 호출 인자를 잡는다',
    produces.some((rule) => rule.test("setStrategy('REPLACE')")),
  );
  check(
    'z.enum 배열은 통과시킨다',
    !produces.some((rule) => rule.test("z.enum(['INITIAL', 'UPSERT', 'REPLACE'])")),
  );
  check(
    '서버 값 비교는 통과시킨다',
    !produces.some((rule) => rule.test("preflight.strategy === 'REPLACE'")),
  );
  check(
    '전략을 키로 쓰는 맵은 통과시킨다',
    !produces.some((rule) => rule.test('const COPY = { UPSERT: {}, INITIAL: {} };')),
  );
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
  // 13px 에서 "현재 적재" 는 w-12(48px)를 0.2px 넘겨 두 줄로 접힌다.
  check('현재 적재 라벨은 한 줄', /<span class="[^"]*whitespace-nowrap[^"]*">현재 적재</.test(opened));
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
  // 호출부 onError 와 MutationCache 의 전역 onError 가 겹치면 같은 문구가 두 번 뜬다.
  const toasts = body.match(/처리할 수 없는 값이 있어요\./g)?.length ?? 0;
  eq('토스트는 한 번만 (04 §9-2)', toasts, 1);
  check('모달은 열린 채로 둔다', body.includes('적재할 학기를 골라주세요.'));

  server.resetHandlers();
  queryClient.clear();
}

section('초기값을 못 정하면 [데이터 업데이트] 를 잠근다 (사용자 결정 · 01 §6-3 보완)');
{
  mockDb.reset();
  mockDb.state.loadedSemester = null;
  mockDb.state.courseCount = 0;
  mockDb.state.scheduleCount = 0;
  queryClient.clear();
  server.use(
    http.get('http://localhost:8080/api/v1/admin/semesters/display', () =>
      HttpResponse.json({ code: 5100, message: '표시 학기 설정이 없습니다.' }, { status: 404 }),
    ),
  );

  const { settled, focused, hasWrapper } = await probe.focusBlockedUpdateButton();
  check('버튼을 span 으로 감싸 툴팁을 붙였다', hasWrapper);
  check('[데이터 업데이트] 비활성', isDisabled(updateButtonTag(settled)));
  check('툴팁 문구', text(focused).includes('학기 정보를 불러온 뒤에 시작할 수 있어요.'));
  check('RUNNING 문구를 쓰지 않는다', !text(focused).includes('업데이트가 진행 중이에요.'));

  server.resetHandlers();
  queryClient.clear();
}

section('차단 사유가 겹치면 RUNNING 이 이긴다 (01 §6-3 문구가 명세다)');
{
  mockDb.reset();
  mockDb.state.loadedSemester = null;
  mockDb.createJob({ academicYear: 2026, term: 'FIRST' }, 'INITIAL', '김학사');
  queryClient.clear();
  server.use(
    http.get('http://localhost:8080/api/v1/admin/semesters/display', () =>
      HttpResponse.json({ code: 5100, message: '표시 학기 설정이 없습니다.' }, { status: 404 }),
    ),
  );

  const { settled, focused } = await probe.focusBlockedUpdateButton();
  check('[데이터 업데이트] 비활성', isDisabled(updateButtonTag(settled)));
  check('RUNNING 문구가 나온다', text(focused).includes('업데이트가 진행 중이에요.'));
  check(
    '초기값 문구에 덮이지 않는다',
    !text(focused).includes('학기 정보를 불러온 뒤에 시작할 수 있어요.'),
  );

  server.resetHandlers();
  queryClient.clear();
}

section('초기값이 있으면 [데이터 업데이트] 는 활성이다');
{
  mockDb.reset();
  queryClient.clear();
  const { settled } = await probe.renderSyncMain(300);
  const tag = updateButtonTag(settled);
  check('버튼을 찾았다', tag !== '');
  check('비활성이 아니다', !isDisabled(tag), tag.slice(-40));
  queryClient.clear();
}

await close();
export default result;
