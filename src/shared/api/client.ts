import axios from 'axios';

import { env } from '@/env';
import { tokenManager } from '@/shared/api/tokenManager';

export const apiClient = axios.create({
  baseURL: `${env.VITE_API_HOST}/api/v1/admin`,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenManager.getAccessToken();
  if (token !== null) config.headers.set('access-token', token);
  return config;
});
