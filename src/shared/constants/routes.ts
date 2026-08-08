/** 04 §8. 화면은 2개뿐이다 (D8). 이동은 전부 이 상수를 쓴다 — 문자열 하드코딩 금지. */
export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
