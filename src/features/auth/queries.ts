import { useMutation } from '@tanstack/react-query';

import { login } from '@/features/auth/api';

/**
 * 로그인 실패(401/5000)는 토스트가 아니라 카드 하단 인라인 에러다 (01 §5-2).
 * 전역 mutationCache 가 401 을 토스트에서 제외하므로 화면이 직접 문구를 그린다.
 */
export function useLoginMutation() {
  return useMutation({ mutationFn: login });
}
