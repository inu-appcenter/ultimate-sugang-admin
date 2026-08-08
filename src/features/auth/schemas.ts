import { z } from 'zod';

import { authTokenResponseSchema } from '@/shared/api/schemas';
import { fieldLimits } from '@/shared/constants/fieldLimits';

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

export const authTokenSchema = authTokenResponseSchema;
export type AuthToken = z.infer<typeof authTokenSchema>;
