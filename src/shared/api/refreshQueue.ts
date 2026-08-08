import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { apiClient } from '@/shared/api/client';
import { authTokenResponseSchema } from '@/shared/api/schemas';
import { tokenManager } from '@/shared/api/tokenManager';
import { ROUTES } from '@/shared/constants/routes';

const REFRESH_PATH = '/auth/refresh';
const LOGIN_PATH = '/auth/login';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let waiters: Array<(token: string | null) => void> = [];

function notifyWaiters(token: string | null): void {
  const pending = waiters;
  waiters = [];
  for (const resolve of pending) resolve(token);
}

const SESSION_EXPIRED_KEY = 'uss_admin_session_expired';

export const SESSION_EXPIRED_MESSAGE = '다시 로그인해주세요.';

export function markSessionExpired(): void {
  sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
}

export function consumeSessionExpiredFlag(): boolean {
  const marked = sessionStorage.getItem(SESSION_EXPIRED_KEY) !== null;
  if (marked) sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  return marked;
}

function forceLogout(): void {
  tokenManager.clear();
  markSessionExpired();
  window.location.href = ROUTES.LOGIN;
}

export function installRefreshInterceptor(): void {
  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetriableConfig | undefined;
      if (error.response?.status !== 401 || !original || original._retry) {
        return Promise.reject(error);
      }

      if (original.url?.includes(LOGIN_PATH)) return Promise.reject(error);

      if (original.url?.includes(REFRESH_PATH)) return Promise.reject(error);
      original._retry = true;

      if (isRefreshing) {
        const token = await new Promise<string | null>((resolve) => waiters.push(resolve));
        if (token === null) return Promise.reject(error);
        original.headers.set('access-token', token);
        return apiClient.request(original);
      }

      const expired = tokenManager.getAccessToken();
      if (expired === null) {
        forceLogout();
        return Promise.reject(error);
      }

      isRefreshing = true;
      try {
        const { data } = await apiClient.post(REFRESH_PATH, null, {
          headers: { 'access-token': expired },
        });
        const reissued = authTokenResponseSchema.parse(data);
        tokenManager.set(reissued.accessToken, reissued.name);
        notifyWaiters(reissued.accessToken);
        original.headers.set('access-token', reissued.accessToken);
        return apiClient.request(original);
      } catch (reissueError) {
        notifyWaiters(null);
        forceLogout();
        return Promise.reject(reissueError);
      } finally {
        isRefreshing = false;
      }
    },
  );
}
