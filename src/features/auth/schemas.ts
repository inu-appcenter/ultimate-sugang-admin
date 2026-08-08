import { z } from 'zod';

import { authTokenResponseSchema } from '@/shared/api/schemas';
import { fieldLimits } from '@/shared/constants/fieldLimits';

/** 01 §5-3 — 아이디 필수·50자 / 비밀번호 필수·100자. 미입력이면 요청을 보내지 않는다. */
export const loginFormSchema = z.object({
  loginId: z
    .string()
    .min(1, '아이디를 입력해주세요.')
    .max(fieldLimits.loginId, `아이디는 ${fieldLimits.loginId}자까지 쓸 수 있어요.`),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요.')
    .max(fieldLimits.password, `비밀번호는 ${fieldLimits.password}자까지 쓸 수 있어요.`),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

/**
 * 03 §3-1 · §3-2 — 로그인과 재발급이 `{ accessToken, name }` 로 같다.
 * 전송 계층(refreshQueue)도 같은 스키마를 쓰므로 shared 에 있는 정의를 가져다 쓴다.
 */
export const authTokenSchema = authTokenResponseSchema;
export type AuthToken = z.infer<typeof authTokenSchema>;
