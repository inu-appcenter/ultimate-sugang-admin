export type { AuthToken, LoginFormValues } from '@/features/auth/schemas';

export interface AuthState {
  name: string | null;
  isAuthenticated: boolean;
  setAdmin: (name: string) => void;
  reset: () => void;
}
