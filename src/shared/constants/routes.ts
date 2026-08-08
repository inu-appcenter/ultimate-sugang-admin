/** 화면은 2개뿐이다 — ADMIN_LOGIN · SYNC_MAIN (rules/decisions.md D8). 세 번째를 추가하지 않는다. */
export const ROUTES = {
  LOGIN: '/login',
  SYNC_MAIN: '/',
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
