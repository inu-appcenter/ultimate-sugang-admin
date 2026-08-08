import { z } from 'zod';

import {
  courseTermSchema,
  paginatedSchema,
  syncJobStatusSchema,
  syncStrategySchema,
} from '@/shared/api/schemas';

export const semesterRefSchema = z.object({
  academicYear: z.number(),
  term: courseTermSchema,
});
export type SemesterRef = z.infer<typeof semesterRefSchema>;

export const lastJobSchema = z.object({
  jobId: z.number(),
  status: syncJobStatusSchema,
  startedAt: z.string(),
  createdCount: z.number().nullable(),
  updatedCount: z.number().nullable(),
  closedCount: z.number().nullable(),
});

export const coursesSummarySchema = z.object({
  semester: semesterRefSchema.nullable(),
  courseCount: z.number(),
  scheduleCount: z.number(),
  lastJob: lastJobSchema.nullable(),
  runningJobId: z.number().nullable(),
});
export type CoursesSummary = z.infer<typeof coursesSummarySchema>;

export const deleteCountsSchema = z.object({
  courses: z.number(),
  schedules: z.number(),
  carts: z.number(),
  registrations: z.number(),
});
export type DeleteCounts = z.infer<typeof deleteCountsSchema>;

export const syncPreflightSchema = z.object({
  strategy: syncStrategySchema,
  currentSemester: semesterRefSchema.nullable(),
  targetSemester: semesterRefSchema,
  deleteCounts: deleteCountsSchema,
});
export type SyncPreflight = z.infer<typeof syncPreflightSchema>;

export const syncJobCreateRequestSchema = semesterRefSchema.extend({
  expectedStrategy: syncStrategySchema,
});
export type SyncJobCreateRequest = z.infer<typeof syncJobCreateRequestSchema>;

export const syncJobCreatedSchema = z.object({ jobId: z.number() });
export type SyncJobCreated = z.infer<typeof syncJobCreatedSchema>;

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
