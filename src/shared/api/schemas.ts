import { z } from 'zod';

export const errorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
});

export const authTokenResponseSchema = z.object({
  accessToken: z.string(),
  name: z.string(),
});
export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;

export const courseTermSchema = z.enum(['FIRST', 'SECOND', 'SUMMER', 'WINTER']);
export type CourseTerm = z.infer<typeof courseTermSchema>;

export const syncStrategySchema = z.enum(['INITIAL', 'UPSERT', 'REPLACE']);
export type SyncStrategy = z.infer<typeof syncStrategySchema>;

export const syncJobStatusSchema = z.enum(['RUNNING', 'SUCCESS', 'FAILED']);
export type SyncJobStatus = z.infer<typeof syncJobStatusSchema>;

export const paginatedSchema = <T extends z.ZodTypeAny>(content: T) =>
  z.object({
    page: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    content: z.array(content),
  });
