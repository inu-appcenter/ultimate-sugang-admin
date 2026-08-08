import { authTokenSchema, type AuthToken, type LoginFormValues } from '@/features/auth/schemas';
import { apiClient } from '@/shared/api/client';

export async function login(values: LoginFormValues): Promise<AuthToken> {
  const { data } = await apiClient.post('/auth/login', values);
  return authTokenSchema.parse(data);
}

export async function reissueToken(): Promise<AuthToken> {
  const { data } = await apiClient.post('/auth/refresh', null);
  return authTokenSchema.parse(data);
}
