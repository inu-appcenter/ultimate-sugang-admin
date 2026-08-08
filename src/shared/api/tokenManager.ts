/**
 * access 토큰 하나와 관리자 이름만 보관한다. refresh 토큰이 존재하지 않는다 (03 §2-2).
 *
 * localStorage 에 두는 이유(04 §6-3): refresh 가 없어서 메모리에 두면 새로고침마다 로그아웃된다.
 * XSS 노출은 감수한 절충이다 — 내부 담당자 수 명 · 학내망 · 토큰 2시간.
 */
const TOKEN_KEY = 'uss_admin_access_token';
const NAME_KEY = 'uss_admin_name';

export const tokenManager = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getName: () => localStorage.getItem(NAME_KEY),
  set: (token: string, name: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(NAME_KEY, name);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
  },
};
