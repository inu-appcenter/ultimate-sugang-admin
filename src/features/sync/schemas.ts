import { z } from 'zod';

import {
  courseTermSchema,
  paginatedSchema,
  syncJobStatusSchema,
  syncStrategySchema,
} from '@/shared/api/schemas';

/**
 * 04 §9-1 · 03 §5-1, §6-3.
 * ⚠️ nullable 은 `.nullable()` 로 명시한다. `?? 0` 으로 덮으면 안 된다 —
 * `null`(아직 정해지지 않음)과 `0`(없음)은 화면에서 다르게 보여야 한다.
 */
export const semesterRefSchema = z.object({
  academicYear: z.number(),
  term: courseTermSchema,
});
export type SemesterRef = z.infer<typeof semesterRefSchema>;

/** 카운트 3종은 status 가 SUCCESS 가 아니면 null 이다. */
export const lastJobSchema = z.object({
  jobId: z.number(),
  status: syncJobStatusSchema,
  startedAt: z.string(),
  createdCount: z.number().nullable(),
  updatedCount: z.number().nullable(),
  closedCount: z.number().nullable(),
});

/** 03 §5-1. `courseCount` 는 폐강(CLOSED)을 포함한다 — "활성 과목 수"가 아니다 (D3). */
export const coursesSummarySchema = z.object({
  semester: semesterRefSchema.nullable(),
  courseCount: z.number(),
  scheduleCount: z.number(),
  lastJob: lastJobSchema.nullable(),
  runningJobId: z.number().nullable(),
});
export type CoursesSummary = z.infer<typeof coursesSummarySchema>;

/** 03 §6-3 이력 목록 행. 상세와 달리 executedBy·progress 를 포함하지 않는다. */
export const syncJobListItemSchema = z.object({
  jobId: z.number(),
  academicYear: z.number(),
  term: courseTermSchema,
  strategy: syncStrategySchema,
  status: syncJobStatusSchema,
  startedAt: z.string(),
  createdCount: z.number().nullable(),
  updatedCount: z.number().nullable(),
  closedCount: z.number().nullable(),
});
export type SyncJobListItem = z.infer<typeof syncJobListItemSchema>;

export const syncJobPageSchema = paginatedSchema(syncJobListItemSchema);
export type SyncJobPage = z.infer<typeof syncJobPageSchema>;
