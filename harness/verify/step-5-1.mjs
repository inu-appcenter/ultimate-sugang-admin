/** step-5-1:M1_semester — 표시 학기 조회/변경 모달. 계약·옵션·마크업·D10 격리. */
import { readdirSync, readFileSync } from 'node:fs';
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
const { fetchDisplaySemester, updateDisplaySemester } = await load('/src/features/semester/api.ts');
const { semesterKeys } = await load('/src/features/semester/queries.ts');
const { syncKeys } = await load('/src/features/sync/queries.ts');
const { academicYearOptions, currentAcademicYear } = await load(
  '/src/shared/lib/academicYearOptions.ts',
);
const { TERM_ORDER, termLabels } = await load('/src/shared/constants/labels.ts');
const probe = await load('/harness/verify/probe.tsx');

installRefreshInterceptor();

const { result, check, eq, section } = createChecker();

const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

// spinner 가 붙으면 버튼 안에 svg 가 끼므로 여는 태그만 따로 잘라 낸다.
const saveButtonTag = (html) => {
  const element = /<button[^>]*>(?:(?!<\/button>)[\s\S])*?저장\s*<\/button>/.exec(html)?.[0];
  return element === undefined ? '' : (/<button[^>]*>/.exec(element)?.[0] ?? '');
};
// class 에 Tailwind 의 `disabled:` 변형이 잔뜩 들어 있어서 속성 자리인지까지 봐야 한다.
const isDisabled = (tag) => /\sdisabled(?:=|\s|$)/.test(tag);

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const kstYear = new Date(Date.now() + KST_OFFSET_MS).getUTCFullYear();

await login({ loginId: 'haksa01', password: 'uss1234!' }).then((token) =>
  tokenManager.set(token.accessToken, token.name),
);

section('연도 옵션 — 현재 연도 ±2 (01 §7-1)');
{
  const years = academicYearOptions(kstYear);
  eq('KST 기준 현재 연도', currentAcademicYear(), kstYear);
  eq('5개', years.length, 5);
  eq('현재 연도 ±2', years, [kstYear - 2, kstYear - 1, kstYear, kstYear + 1, kstYear + 2]);
}

section('학기 옵션 순서 — TERM_CODE 정렬이 아니다 (decisions 기타 확정값)');
{
  eq(
    '1학기 → 여름계절학기 → 2학기 → 겨울계절학기',
    TERM_ORDER.map((term) => termLabels[term]),
    ['1학기', '여름계절학기', '2학기', '겨울계절학기'],
  );
}

section('계약 — PUT /semesters/display (03 §4-2)');
{
  mockDb.reset();
  const before = await fetchDisplaySemester();
  eq('초기값', before, { academicYear: 2026, term: 'SECOND' });

  const updated = await updateDisplaySemester({ academicYear: 2027, term: 'SUMMER' });
  eq('응답을 그대로 파싱', updated, { academicYear: 2027, term: 'SUMMER' });
  eq('서버 상태가 바뀐다', await fetchDisplaySemester(), {
    academicYear: 2027,
    term: 'SUMMER',
  });

  const rejected = await updateDisplaySemester({ academicYear: 2026, term: 'NOPE' }).catch(
    (error) => error,
  );
  check('enum 밖 값은 400 으로 막힌다', rejected instanceof Error);
}

section('D10 — 저장은 표시 학기만 무효화한다 (카드 2 무영향)');
{
  mockDb.reset();
  queryClient.clear();
  queryClient.setQueryData(semesterKeys.display(), { academicYear: 2026, term: 'SECOND' });
  queryClient.setQueryData(syncKeys.summary(), {
    semester: { academicYear: 2026, term: 'FIRST' },
    courseCount: 1203,
    scheduleCount: 2847,
    lastJob: null,
    runningJobId: null,
  });

  await probe.runDisplaySemesterUpdate({ academicYear: 2026, term: 'WINTER' });

  check(
    '표시 학기 캐시는 무효화된다',
    queryClient.getQueryState(semesterKeys.display())?.isInvalidated === true,
  );
  check(
    '적재 현황 캐시는 건드리지 않는다',
    queryClient.getQueryState(syncKeys.summary())?.isInvalidated === false,
  );
  eq('적재 현황 값 그대로', queryClient.getQueryData(syncKeys.summary())?.courseCount, 1203);
  queryClient.clear();
}

section('모달 마크업 — [학기 설정] 으로 연다 (01 §7-1)');
{
  mockDb.reset();
  queryClient.clear();
  const { hasTrigger, opened, afterCancel } = await probe.openSemesterSettingModal();
  const body = text(opened);

  check('카드에 [학기 설정] 버튼이 있다', hasTrigger);
  check('제목', body.includes('표시 학기 설정'));
  check('안내 1', body.includes('서비스 화면에 보이는 학기예요.'));
  check('안내 2', body.includes('강의 데이터에는 영향을 주지 않아요.'));
  check('연도 라벨', body.includes('연도'));
  check('학기 라벨', body.includes('학기'));
  check('초기값 = 현재 설정 연도', body.includes('2026'));
  check('초기값 = 현재 설정 학기', body.includes('2학기'));
  check('[취소]', body.includes('취소'));
  check('[저장]', body.includes('저장'));

  const saveTag = saveButtonTag(opened);
  check('변경 없으면 [저장] 비활성', saveTag !== '' && isDisabled(saveTag), saveTag.slice(-60));

  check('폭 400px (max-w-modal)', opened.includes('max-w-modal'));
  check('M4 전용 480px 이 아니다', !opened.includes('max-w-modal-wide'));
  check('카드 radius 가 아니라 modal radius', opened.includes('rounded-modal'));
  // 맨 duration-200 은 (0,1,0) 이라 animate-in 의 (0,2,0) 150ms 한테 진다.
  check('모션 200ms 를 variant 로 건다', opened.includes('data-[state=open]:duration-200'));
  check('맨 duration-200 을 쓰지 않는다', !/(?<![\]:])\bduration-200\b/.test(opened));
  check('다크·반응형 클래스 없음', !/\bdark:|["'\s:](sm|md|lg|xl):[a-z[]/.test(opened));
  check('raw hex 없음', !/#[0-9a-fA-F]{6}\b/.test(opened));

  check('[취소] 로 닫힌다', !text(afterCancel).includes('표시 학기 설정'));
}

section('변경 → [저장] (01 §7-1 · 04 §10-7)');
{
  mockDb.reset();
  queryClient.clear();
  // 응답이 즉시 오면 pending 스냅샷을 찍을 틈이 없다. 150ms 늦춰 저장 중 화면을 본다.
  server.use(
    http.put('http://localhost:8080/api/v1/admin/semesters/display', async ({ request }) => {
      await delay(150);
      const body = await request.json();
      mockDb.state.displaySemester = body;
      return HttpResponse.json(body);
    }),
  );

  const { optionLabels, dirty, saving, afterSave } = await probe.changeDisplaySemesterTerm(
    '겨울계절학기',
    400,
  );
  server.resetHandlers();

  eq('학기 목록은 TERM_ORDER 순서', optionLabels, [
    '1학기',
    '여름계절학기',
    '2학기',
    '겨울계절학기',
  ]);

  const dirtySaveTag = saveButtonTag(dirty);
  check(
    '바꾸면 [저장] 활성',
    dirtySaveTag !== '' && !isDisabled(dirtySaveTag),
    dirtySaveTag.slice(-60),
  );

  check('저장 중에는 spinner (DS-01 §6)', /animate-spin/.test(saving));
  check('저장 중에는 [저장] 비활성', isDisabled(saveButtonTag(saving)));

  eq('서버 반영', mockDb.state.displaySemester, { academicYear: 2026, term: 'WINTER' });
  check('성공 토스트', text(afterSave).includes('표시 학기를 변경했어요.'));
  check('모달이 닫힌다', !text(afterSave).includes('표시 학기 설정'));
  check('카드가 새 값을 보여준다', text(afterSave).includes('2026학년도 겨울계절학기'));
  queryClient.clear();
}

section('shared/ui 모션 — variant animate 에는 variant duration 을 짝지운다');
{
  // 렌더 마크업만 보면 그 화면에 안 뜬 컴포넌트를 영영 못 잡는다. 소스를 직접 훑는다.
  const uiDir = join(process.cwd(), 'src/shared/components/ui');
  const missing = { open: [], closed: [] };

  for (const name of readdirSync(uiDir).filter((file) => file.endsWith('.tsx'))) {
    const source = readFileSync(join(uiDir, name), 'utf8');
    for (const state of ['open', 'closed']) {
      const animate = state === 'open' ? 'animate-in' : 'animate-out';
      if (!source.includes(`data-[state=${state}]:${animate}`)) continue;
      if (source.includes(`data-[state=${state}]:duration-`)) continue;
      missing[state].push(name);
    }
  }

  eq('열림 모션에 duration 이 빠진 파일', missing.open, []);
  eq('닫힘 모션에 duration 이 빠진 파일', missing.closed, []);
}

await close();
export default result;
