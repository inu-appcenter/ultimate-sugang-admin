import { z } from 'zod';

/**
 * 전송 계층이 직접 파싱하는 스키마만 둔다. 도메인 응답 스키마는 features/{domain}/schemas.ts 다.
 * 여기 있는 두 개는 shared 가 스스로 쓴다 — errorHandler 가 에러 본문을, refreshQueue 가 재발급 응답을 판다.
 */

/** 03 §2-5 — `{ code: number, message: string }`. code 는 정수. */
export const errorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
});

/**
 * 03 §3-1, §3-2 — `/auth/login` 과 `/auth/refresh` 가 같은 구조를 준다.
 * refreshToken 이 없다. `name` 은 헤더 우측 표시용이며 `/admin/me` 가 없어서 여기로 온다.
 */
export const authTokenResponseSchema = z.object({
  accessToken: z.string(),
  name: z.string(),
});
export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;

/**
 * 03 §8 계약 enum. 값을 더하거나 바꾸지 않는다.
 * shared 에 두는 이유: `CourseTerm` 은 semester·sync 두 도메인이 함께 쓰는데
 * features 끼리 직접 import 할 수 없다 (04 §4-1). 한글 라벨도 이미 shared/constants/labels.ts 에 있다.
 */
export const courseTermSchema = z.enum(['FIRST', 'SECOND', 'SUMMER', 'WINTER']);
export type CourseTerm = z.infer<typeof courseTermSchema>;

export const syncStrategySchema = z.enum(['INITIAL', 'UPSERT', 'REPLACE']);
export type SyncStrategy = z.infer<typeof syncStrategySchema>;

/** 중간 상태는 RUNNING 하나뿐이다 — PREVIEW·PENDING 같은 값을 만들지 않는다 (D11). */
export const syncJobStatusSchema = z.enum(['RUNNING', 'SUCCESS', 'FAILED']);
export type SyncJobStatus = z.infer<typeof syncJobStatusSchema>;

export const syncChangeTypeSchema = z.enum(['CREATED', 'UPDATED', 'CLOSED', 'WARNING']);
export type SyncChangeType = z.infer<typeof syncChangeTypeSchema>;

export const syncPhaseSchema = z.enum(['COURSE_FETCH', 'TIMETABLE_FETCH', 'PERSIST']);
export type SyncPhase = z.infer<typeof syncPhaseSchema>;

/** 03 §2-4 페이지네이션 래퍼. content 스키마만 갈아끼운다. */
export const paginatedSchema = <T extends z.ZodTypeAny>(content: T) =>
  z.object({
    page: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    content: z.array(content),
  });
