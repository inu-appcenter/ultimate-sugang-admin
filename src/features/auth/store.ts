import { create } from 'zustand';

import type { AuthState } from '@/features/auth/types';

/**
 * 04 §7-2. 관리자 이름만 들고 있는다.
 * 토큰은 tokenManager(localStorage)가 갖고, 이름은 `/auth/login`·`/auth/refresh` 응답에서 온다
 * — 이름 조회 전용 엔드포인트가 존재하지 않는다 (03 §2).
 */
export const useAuthStore = create<AuthState>((set) => ({
  name: null,
  isAuthenticated: false,
  setAdmin: (name) => set({ name, isAuthenticated: true }),
  reset: () => set({ name: null, isAuthenticated: false }),
}));
