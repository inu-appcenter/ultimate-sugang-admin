import { z } from 'zod';

const schema = z.object({
  VITE_API_HOST: z.string().url(),
  VITE_USE_MSW: z.enum(['true', 'false']).default('false'),
});

const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error('환경 변수 설정이 올바르지 않습니다. .env 파일을 확인해주세요.');
}
export const env = parsed.data;
