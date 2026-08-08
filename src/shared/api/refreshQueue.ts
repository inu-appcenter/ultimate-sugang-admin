import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/client';
import { authTokenResponseSchema } from '@/shared/api/schemas';
import { tokenManager } from '@/shared/api/tokenManager';
import { ROUTES } from '@/shared/constants/routes';

/**
 * 401 재발급 큐 (04 §6-4).
 * 401 이 여러 개 동시에 터져도 재발급 요청은 **한 번만** 나간다. 나머지는 큐에서 기다렸다가
 * 새 토큰을 받아 각자 원래 요청을 다시 보낸다.
 *
 * refresh 토큰이 없다 — 만료된 access 토큰을 그대로 `access-token` 헤더에 실어 보내면
 * 서버가 서명만 보고 새 토큰을 준다 (03 §3-2).
 */
const REFRESH_PATH = '/auth/refresh';
/** 로그인 401 은 "비밀번호가 틀렸다"는 뜻이다. 재발급 대상이 아니라 화면이 인라인으로 보여준다 (04 §7-1). */
const LOGIN_PATH = '/auth/login';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let waiters: Array<(token: string | null) => void> = [];

function notifyWaiters(token: string | null): void {
  const pending = waiters;
  waiters = [];
  for (const resolve of pending) resolve(token);
}

/**
 * 서버를 부르지 않는다 — `/auth/logout` 엔드포인트가 없다 (03 §3-3).
 * 토큰을 버리고 통째로 리로드하므로 메모리에 있던 auth store 도 같이 사라진다.
 */
function forceLogout(): void {
  tokenManager.clear();
  toast.error('다시 로그인해주세요.');
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

      // 재발급 요청 자체가 401 이면 되살릴 방법이 없다.
      if (original.url?.includes(REFRESH_PATH)) {
        forceLogout();
        return Promise.reject(error);
      }
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
