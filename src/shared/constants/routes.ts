export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
