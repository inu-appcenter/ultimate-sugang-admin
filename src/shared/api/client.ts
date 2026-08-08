import axios from 'axios';

import { env } from '@/env';
import { tokenManager } from '@/shared/api/tokenManager';

/**
 * axios 인스턴스는 **1개**다 (04 §6-1).
 * `/auth/refresh` 도 같은 base 를 쓰고 헤더만 다르므로 authApiClient 를 따로 만들지 않는다.
 */
export const apiClient = axios.create({
  baseURL: `${env.VITE_API_HOST}/api/v1/admin`,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

/** 인증 헤더 이름은 `access-token` 하나뿐이다 (03 §2-2). */
apiClient.interceptors.request.use((config) => {
  const token = tokenManager.getAccessToken();
  if (token !== null) config.headers.set('access-token', token);
  return config;
});
