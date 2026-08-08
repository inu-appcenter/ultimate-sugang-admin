import { isAxiosError } from 'axios';
import { toast } from 'sonner';

import { errorResponseSchema } from '@/shared/api/schemas';
import { REUSED_CODE_MESSAGE } from '@/shared/constants/errorCodes';

const ADMIN_CODE_MIN = 5000;
const ADMIN_CODE_MAX = 5999;

const HTTP_STATUS_MESSAGE: Record<number, string> = {
  400: '입력값을 다시 확인해주세요.',
  403: '관리자 권한이 없어요.',
  404: '요청한 항목을 찾을 수 없어요.',
};

const SERVER_ERROR_MESSAGE = '서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요.';
const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인해주세요.';

export function getErrorCode(error: unknown): number | null {
  if (!isAxiosError(error) || !error.response) return null;
  const parsed = errorResponseSchema.safeParse(error.response.data);
  return parsed.success ? parsed.data.code : null;
}

export function getErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return SERVER_ERROR_MESSAGE;
  if (!error.response) return NETWORK_ERROR_MESSAGE;

  const { status, data } = error.response;
  const parsed = errorResponseSchema.safeParse(data);
  if (parsed.success) {
    const { code, message } = parsed.data;
    if (code >= ADMIN_CODE_MIN && code <= ADMIN_CODE_MAX) return message;
    const reused = REUSED_CODE_MESSAGE[code];
    if (reused) return reused;
  }

  const byStatus = HTTP_STATUS_MESSAGE[status];
  if (byStatus) return byStatus;
  return SERVER_ERROR_MESSAGE;
}

export function showErrorToast(error: unknown): void {
  if (isAxiosError(error) && error.response?.status === 401) return;
  toast.error(getErrorMessage(error));
}
