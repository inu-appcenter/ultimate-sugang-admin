import { isAxiosError } from 'axios';
import { toast } from 'sonner';

import { errorResponseSchema } from '@/shared/api/schemas';
import { REUSED_CODE_MESSAGE } from '@/shared/constants/errorCodes';

/**
 * 04 §9-2 우선순위:
 *   1. 백오피스 5000번대 → 서버 message 그대로 (이미 구어체다)
 *   2. 재사용 코드(7777·8888·9999) → 클라이언트 자체 문구
 *   3. HTTP 상태별 기본 문구
 *   4. 네트워크 에러
 *
 * 1000~1004 는 언제나 401 과 함께 오고 401 은 토스트를 띄우지 않는다(인터셉터 담당).
 */
const ADMIN_CODE_MIN = 5000;
const ADMIN_CODE_MAX = 5999;

const HTTP_STATUS_MESSAGE: Record<number, string> = {
  400: '입력값을 다시 확인해주세요.',
  403: '관리자 권한이 없어요.',
  404: '요청한 항목을 찾을 수 없어요.',
};

const SERVER_ERROR_MESSAGE = '서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요.';
const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인해주세요.';

export function getErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return SERVER_ERROR_MESSAGE;
  if (!error.response) return NETWORK_ERROR_MESSAGE;

  const { status, data } = error.response;
  const parsed = errorResponseSchema.safeParse(data);
  if (parsed.success) {
    const { code, message } = parsed.data;
    // 409(5200·5201)도 여기서 서버 문구를 그대로 쓴다.
    if (code >= ADMIN_CODE_MIN && code <= ADMIN_CODE_MAX) return message;
    const reused = REUSED_CODE_MESSAGE[code];
    if (reused) return reused;
  }

  const byStatus = HTTP_STATUS_MESSAGE[status];
  if (byStatus) return byStatus;
  return SERVER_ERROR_MESSAGE;
}

/** 401 은 토스트를 띄우지 않는다 — refreshQueue 인터셉터가 재발급/재로그인으로 처리한다. */
export function showErrorToast(error: unknown): void {
  if (isAxiosError(error) && error.response?.status === 401) return;
  toast.error(getErrorMessage(error));
}
