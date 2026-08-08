import { create } from 'zustand';

import type { AuthState } from '@/features/auth/types';

export const useAuthStore = create<AuthState>((set) => ({
  name: null,
  isAuthenticated: false,
  setAdmin: (name) => set({ name, isAuthenticated: true }),
  reset: () => set({ name: null, isAuthenticated: false }),
}));
