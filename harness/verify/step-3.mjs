/** step-3:ADMIN_LOGIN — 폼 검증 · protectedLoader · 로그인 흐름 · 화면 마크업. */
import { createChecker, createRuntime, installDom } from './env.mjs';

const dom = installDom();
const { load, close } = await createRuntime();

const { mockDb } = await load('/src/mocks/db.ts');
const { tokenManager } = await load('/src/shared/api/tokenManager.ts');
const { installRefreshInterceptor } = await load('/src/shared/api/refreshQueue.ts');
const { login, reissueToken } = await load('/src/features/auth/api.ts');
const { consumeSessionExpiredFlag, SESSION_EXPIRED_MESSAGE } = await load(
  '/src/shared/api/refreshQueue.ts',
);
const { useAuthStore } = await load('/src/features/auth/store.ts');
const { loginFormSchema } = await load('/src/features/auth/schemas.ts');
const { router } = await load('/src/app/router.tsx');
const { cn } = await load('/src/shared/lib/cn.ts');
const probe = await load('/harness/verify/probe.tsx');

installRefreshInterceptor();

const { result, check, eq, section } = createChecker();

// protectedLoader 는 router.tsx 안에 있다(04 §4). 라우터에서 꺼내 직접 태운다.
const guarded = router.routes.find((route) => typeof route.loader === 'function');
const runLoader = () =>
  guarded.loader({ request: new Request('http://localhost/'), params: {} });

section('폼 검증 — 미입력이면 요청을 보내지 않는다 (01 §5-3)');
{
  const empty = loginFormSchema.safeParse({ loginId: '', password: '' });
  check('빈 값은 검증 실패', !empty.success);
  eq(
    '문구가 구어체',
    empty.error.issues.map((i) => i.message),
    ['아이디를 입력해주세요.', '비밀번호를 입력해주세요.'],
  );
  check('아이디 51자 거부', !loginFormSchema.safeParse({ loginId: 'a'.repeat(51), password: 'x' }).success);
  check('비밀번호 101자 거부', !loginFormSchema.safeParse({ loginId: 'a', password: 'x'.repeat(101) }).success);
  check('50/100자는 통과', loginFormSchema.safeParse({ loginId: 'a'.repeat(50), password: 'x'.repeat(100) }).success);
}

section('protectedLoader (04 §7-3)');
{
  localStorage.clear();
  useAuthStore.getState().reset();
  const noToken = await runLoader().catch((e) => e);
  check('토큰 없으면 리다이렉트 응답', noToken instanceof Response && noToken.status >= 300);
  eq('목적지 /login', noToken.headers.get('location'), '/login');

  tokenManager.set('mock-access-token-seed', '김학사');
  useAuthStore.getState().reset();
  const restored = await runLoader();
  eq('저장된 이름으로 복원', useAuthStore.getState().name, '김학사');
  eq('통과(null 반환)', restored, null);
  check('isAuthenticated true', useAuthStore.getState().isAuthenticated === true);

  localStorage.clear();
  localStorage.setItem('uss_admin_access_token', 'mock-access-token-orphan');
  useAuthStore.getState().reset();
  await runLoader();
  eq('이름 없으면 재발급으로 복원', useAuthStore.getState().name, '김학사');
  check('새 토큰 저장됨', tokenManager.getAccessToken() !== 'mock-access-token-orphan');

  mockDb.setRefreshBlocked(true);
  localStorage.clear();
  sessionStorage.clear();
  dom.hardNavigated = false;
  localStorage.setItem('uss_admin_access_token', 'mock-access-token-dead');
  useAuthStore.getState().reset();
  const dead = await runLoader().catch((e) => e);
  check('재발급 실패 시 리다이렉트', dead instanceof Response);
  eq('토큰 폐기됨', tokenManager.getAccessToken(), null);
  // 인터셉터가 하드 이동까지 하면 라우터 이동과 경쟁해 만료 안내가 사라진다. 로더만 정리해야 한다.
  check('인터셉터가 하드 이동을 걸지 않는다', dom.hardNavigated === false);
  mockDb.setRefreshBlocked(false);
}

section('세션 만료 안내 (01 §9-1)');
{
  check('로더 경로에서 표식이 남았다', consumeSessionExpiredFlag() === true);
  check('두 번째 호출은 false — 토스트가 두 번 뜨지 않는다', consumeSessionExpiredFlag() === false);
  eq('문구 출처는 한 곳', SESSION_EXPIRED_MESSAGE, '다시 로그인해주세요.');
  sessionStorage.clear();
}

section('로그인 (03 §3-1)');
{
  localStorage.clear();
  dom.hardNavigated = false;
  const ok = await login({ loginId: 'haksa01', password: 'uss1234!' });
  check('성공 응답 파싱', typeof ok.accessToken === 'string' && ok.name === '김학사');

  const bad = await login({ loginId: 'haksa01', password: 'nope' }).catch((e) => e);
  eq('실패 401/5000', [bad.response?.status, bad.response?.data?.code], [401, 5000]);
  eq('인라인에 쓸 문구', bad.response?.data?.message, '아이디나 비밀번호가 맞지 않아요.');
  eq('로그인 401 은 재발급을 타지 않는다', tokenManager.getAccessToken(), null);
  check('강제 로그아웃도 안 걸림', dom.hardNavigated === false);

  tokenManager.set(ok.accessToken, ok.name);
  const reissued = await reissueToken().catch((e) => e);
  check('재발급 응답 { accessToken, name }', reissued.name === '김학사');
}

section('cn() 이 DS-01 토큰을 안 지우는지 (tailwind-merge 그룹 등록)');
{
  // 사고 기록: text-body 를 색으로 오인해 text-primary-foreground 를 지우면
  // Primary 버튼 글자가 파란 배경 위에 어둡게 뜬다.
  const primary = cn('bg-primary text-primary-foreground', 'text-body');
  check('Primary 글자색이 살아남는다', primary.includes('text-primary-foreground'), primary);
  const ghost = cn('text-fg-secondary', 'text-caption');
  check('Ghost 글자색이 살아남는다', ghost.includes('text-fg-secondary'), ghost);
  eq('같은 크기 토큰끼리는 뒤가 이긴다', cn('text-h1', 'text-h2'), 'text-h2');
  eq('모달 폭은 덮어쓰기가 된다', cn('max-w-modal', 'max-w-modal-wide'), 'max-w-modal-wide');
  eq('radius 도 덮어쓰기가 된다', cn('rounded-btn', 'rounded-card'), 'rounded-card');
}

section('화면 (01 §4·§5 · DS-01)');
{
  const loginHtml = probe.renderLoginScreen();
  const lower = loginHtml.toLowerCase();
  check('제목', loginHtml.includes('USS 관리자') && loginHtml.includes('강의 데이터 관리 시스템'));
  check('라벨 아이디·비밀번호', loginHtml.includes('>아이디<') && loginHtml.includes('>비밀번호<'));
  check('로그인 버튼', loginHtml.includes('로그인'));
  check('Primary 버튼 글자가 흰색(text-primary-foreground)', loginHtml.includes('text-primary-foreground'));
  check('LoginLayout 이 카드 폭 400 을 준다', loginHtml.includes('max-w-login-card'));
  check('카드 보더 없음 + shadow-card + radius 14', loginHtml.includes('rounded-card bg-surface p-6 shadow-card'));
  check('입력창 Fill (bg-hover)', loginHtml.includes('bg-hover'));
  check('입력창에 보더 클래스 없음', !/class="[^"]*rounded-btn bg-hover[^"]*\bborder\b/.test(loginHtml));
  check('에러 링이 aria-invalid 로 걸려 있음', loginHtml.includes('aria-invalid:ring-danger-text'));
  check('비밀번호 type=password', loginHtml.includes('type="password"'));
  check('maxLength 50 / 100', lower.includes('maxlength="50"') && lower.includes('maxlength="100"'));
  check('다크·반응형 클래스 없음', !/\bdark:|\b(sm|md|lg|xl):/.test(loginHtml));
  check('raw hex 없음', !/#[0-9a-fA-F]{6}\b/.test(loginHtml));

  useAuthStore.getState().setAdmin('김학사');
  const shellHtml = probe.renderMainShell();
  check('헤더 좌측 서비스명', shellHtml.includes('USS 관리자'));
  check('헤더 56 + 하단 1px', shellHtml.includes('h-header') && shellHtml.includes('border-b border-border'));
  check('헤더 우측 관리자 이름', shellHtml.includes('김학사'));
  check('Ghost 로그아웃 버튼', shellHtml.includes('로그아웃'));
  check('콘텐츠 max-w-content(1024)', shellHtml.includes('max-w-content'));
  check('사이드바·Breadcrumb 없음', !/sidebar|breadcrumb/i.test(shellHtml));
  check('페이지 배경 bg-page', shellHtml.includes('bg-page'));
  check('다크·반응형 클래스 없음', !/\bdark:|\b(sm|md|lg|xl):/.test(shellHtml));
}

await close();
export default result;
