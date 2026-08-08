/** step-2:infra — apiClient · 401 재발급 큐 · MSW 9개 엔드포인트 계약. */
import { createChecker, createRuntime, installDom } from './env.mjs';

const dom = installDom();
const { load, calls, close } = await createRuntime();

const { mockDb } = await load('/src/mocks/db.ts');
const { apiClient } = await load('/src/shared/api/client.ts');
const { tokenManager } = await load('/src/shared/api/tokenManager.ts');
const { installRefreshInterceptor } = await load('/src/shared/api/refreshQueue.ts');
const { toKstLocalString } = await load('/src/mocks/db.ts');

installRefreshInterceptor();

const { result, check, eq, section } = createChecker();

section('로그인 · 인증 헤더');
{
  const bad = await apiClient
    .post('/auth/login', { loginId: 'haksa01', password: 'wrong' })
    .catch((e) => e);
  eq('실패 401/5000', [bad.response?.status, bad.response?.data?.code], [401, 5000]);
  check('문구가 구어체', bad.response?.data?.message === '아이디나 비밀번호가 맞지 않아요.');

  const { data } = await apiClient.post('/auth/login', { loginId: 'haksa01', password: 'uss1234!' });
  check('응답이 { accessToken, name }', 'accessToken' in data && 'name' in data);
  check('refresh 토큰이 없다', !('refreshToken' in data));
  tokenManager.set(data.accessToken, data.name);

  const summary = await apiClient.get('/courses/summary');
  eq('토큰으로 summary 200', summary.status, 200);
  check(
    'summary 필드',
    ['semester', 'courseCount', 'scheduleCount', 'lastJob', 'runningJobId'].every(
      (k) => k in summary.data,
    ),
  );
}

section('401 → 재발급 1회 → 재시도 (동시 3건)');
{
  calls.refresh = 0;
  const before = tokenManager.getAccessToken();
  mockDb.expireTokens();

  const results = await Promise.all([
    apiClient.get('/courses/summary'),
    apiClient.get('/semesters/display'),
    apiClient.get('/sync/jobs'),
  ]);
  eq('3건 모두 200', results.map((r) => r.status), [200, 200, 200]);
  eq('재발급 호출은 1번', calls.refresh, 1);
  check('토큰이 새것으로 교체됨', tokenManager.getAccessToken() !== before);
}

section('재발급 실패 → 토큰 폐기 + 로그인 화면으로');
{
  dom.hardNavigated = false;
  mockDb.expireTokens();
  mockDb.setRefreshBlocked(true);
  const err = await apiClient.get('/courses/summary').catch((e) => e);
  check('요청이 거부됨', err instanceof Error);
  eq('토큰 폐기됨', tokenManager.getAccessToken(), null);
  check('하드 이동 발생', dom.hardNavigated === true);
  eq('세션 만료 표식이 리로드 너머로 넘어감', sessionStorage.getItem('uss_admin_session_expired'), '1');
  sessionStorage.clear();
  mockDb.setRefreshBlocked(false);
}

section('계약 — D4 전략 판정 · 409 2종 · 10행 페이지네이션');
{
  mockDb.reset();
  const { data: login } = await apiClient.post('/auth/login', {
    loginId: 'haksa01',
    password: 'uss1234!',
  });
  tokenManager.set(login.accessToken, login.name);

  const same = await apiClient.post('/sync/preflight', { academicYear: 2026, term: 'FIRST' });
  eq('적재 학기와 같으면 UPSERT', same.data.strategy, 'UPSERT');
  eq('UPSERT 는 삭제 0건', same.data.deleteCounts, {
    courses: 0,
    schedules: 0,
    carts: 0,
    registrations: 0,
  });

  const other = await apiClient.post('/sync/preflight', { academicYear: 2026, term: 'SUMMER' });
  eq('학기가 다르면 REPLACE', other.data.strategy, 'REPLACE');
  check('REPLACE 는 실제 삭제 건수', other.data.deleteCounts.courses === 1203);

  const list = await apiClient.get('/sync/jobs');
  eq('page 는 1부터', list.data.page, 1);
  eq('한 페이지 10행', list.data.content.length, 10);
  eq('12건 → 2페이지', list.data.totalPages, 2);
  check('다음 페이지 있음', list.data.hasNextPage === true);
  check(
    'startedAt 내림차순',
    list.data.content.every((r, i, a) => i === 0 || a[i - 1].startedAt >= r.startedAt),
  );
  check(
    'SUCCESS 아니면 카운트 null',
    list.data.content.find((r) => r.status === 'FAILED')?.createdCount === null,
  );

  const mismatch = await apiClient
    .post('/sync/jobs', { academicYear: 2026, term: 'SUMMER', expectedStrategy: 'UPSERT' })
    .catch((e) => e);
  eq('전략 불일치 409/5201', [mismatch.response?.status, mismatch.response?.data?.code], [409, 5201]);

  const created = await apiClient.post('/sync/jobs', {
    academicYear: 2026,
    term: 'FIRST',
    expectedStrategy: 'UPSERT',
  });
  eq('Job 생성 202', created.status, 202);
  check('jobId 반환', typeof created.data.jobId === 'number');

  const dup = await apiClient
    .post('/sync/jobs', { academicYear: 2026, term: 'FIRST', expectedStrategy: 'UPSERT' })
    .catch((e) => e);
  eq('실행 중 재요청 409/5200', [dup.response?.status, dup.response?.data?.code], [409, 5200]);

  const jobId = created.data.jobId;
  const running = await apiClient.get(`/sync/jobs/${jobId}`);
  eq('RUNNING 상태', running.data.status, 'RUNNING');
  eq('첫 진행률 total 은 null', running.data.progress.total, null);
  eq('진행 중 카운트는 null', running.data.createdCount, null);

  const summary = await apiClient.get('/courses/summary');
  eq('runningJobId 로 폴링 재개 가능', summary.data.runningJobId, jobId);

  const notFound = await apiClient.get('/sync/jobs/9999').catch((e) => e);
  eq('없는 Job 404/5202', [notFound.response?.status, notFound.response?.data?.code], [404, 5202]);

  const details = await apiClient.get('/sync/jobs/41/details?changeType=UPDATED');
  eq('상세 10행', details.data.content.length, 10);
  check('수정 탭에 changedFields 존재', Array.isArray(details.data.content[0].changedFields));
  const warn = await apiClient.get('/sync/jobs/41/details?changeType=WARNING');
  check('경고 탭은 changedFields null + reason', warn.data.content[0].changedFields === null);
  const badType = await apiClient.get('/sync/jobs/41/details').catch((e) => e);
  eq('changeType 누락 400/7777', [badType.response?.status, badType.response?.data?.code], [400, 7777]);
}

section('datetime 은 오프셋 없는 KST 로컬 문자열');
{
  eq('epoch 0 → KST 09:00', toKstLocalString(0), '1970-01-01T09:00:00');
  eq('2026-08-05 14:22 KST', toKstLocalString(Date.UTC(2026, 7, 5, 5, 22, 0)), '2026-08-05T14:22:00');
  eq('윤년 2024-02-29', toKstLocalString(Date.UTC(2024, 1, 28, 15, 0, 0)), '2024-02-29T00:00:00');
  const now = toKstLocalString(Date.now());
  check('Z·오프셋 없음', !now.includes('Z') && !now.includes('+'), now);
  check('길이 19', now.length === 19, now);
}

section('표시 학기 변경이 적재 데이터를 건드리지 않는다 (D10)');
{
  const before = await apiClient.get('/courses/summary');
  await apiClient.put('/semesters/display', { academicYear: 2027, term: 'WINTER' });
  const display = await apiClient.get('/semesters/display');
  eq('표시 학기 변경됨', display.data, { academicYear: 2027, term: 'WINTER' });
  const after = await apiClient.get('/courses/summary');
  eq('적재 학기 그대로', after.data.semester, before.data.semester);
  eq('강의 건수 그대로', after.data.courseCount, before.data.courseCount);
}

await close();
export default result;
