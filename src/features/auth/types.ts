/**
 * 04 §4 — auth 도메인 타입. 손으로 다시 쓰지 않고 Zod 스키마에서 뽑아 쓴다 (04 §9-1).
 */
export type { AuthToken, LoginFormValues } from '@/features/auth/schemas';

/** 관리자 이름을 들고 있는 클라이언트 상태 (04 §7-2). 토큰은 tokenManager 가 갖는다. */
export interface AuthState {
  name: string | null;
  isAuthenticated: boolean;
  setAdmin: (name: string) => void;
  reset: () => void;
}
