import { authTokenSchema, type AuthToken, type LoginFormValues } from '@/features/auth/schemas';
import { apiClient } from '@/shared/api/client';

/** 03 §3-1. 실패는 401/5000 하나뿐 — 아이디 없음과 비밀번호 불일치를 구분하지 않는다. */
export async function login(values: LoginFormValues): Promise<AuthToken> {
  const { data } = await apiClient.post('/auth/login', values);
  return authTokenSchema.parse(data);
}

/**
 * 03 §3-2. 만료된 토큰을 헤더에 그대로 실어 보내면 서명만 보고 새 토큰을 준다.
 * 헤더는 요청 인터셉터가 붙이므로 여기서 따로 넣지 않는다. body 는 없다.
 */
export async function reissueToken(): Promise<AuthToken> {
  const { data } = await apiClient.post('/auth/refresh', null);
  return authTokenSchema.parse(data);
}
