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

export const syncPhaseSchema = z.enum(['COURSE_FETCH', 'TIMETABLE_FETCH', 'PERSIST']);
export type SyncPhase = z.infer<typeof syncPhaseSchema>;

export const syncProgressSchema = z.object({
  phase: syncPhaseSchema,
});
export type SyncProgress = z.infer<typeof syncProgressSchema>;

export const syncJobDetailSchema = z.object({
  jobId: z.number(),
  academicYear: z.number(),
  term: courseTermSchema,
  strategy: syncStrategySchema,
  status: syncJobStatusSchema,
  executedBy: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  fetchedCourseCount: z.number().nullable(),
  fetchedScheduleCount: z.number().nullable(),
  createdCount: z.number().nullable(),
  updatedCount: z.number().nullable(),
  closedCount: z.number().nullable(),
  warningCount: z.number().nullable(),
  progress: syncProgressSchema.nullable(),
  partiallyApplied: z.boolean(),
  failureReason: z.string().nullable(),
});
export type SyncJobDetail = z.infer<typeof syncJobDetailSchema>;

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

export const syncChangeTypeSchema = z.enum(['CREATED', 'UPDATED', 'CLOSED', 'WARNING']);
export type SyncChangeType = z.infer<typeof syncChangeTypeSchema>;

export const changedFieldSchema = z.object({
  field: z.string(),
  before: z.string(),
  after: z.string(),
});
export type ChangedField = z.infer<typeof changedFieldSchema>;

export const syncChangeItemSchema = z.object({
  haksuCode: z.string(),
  courseName: z.string().nullable(),
  changedFields: z.array(changedFieldSchema).nullable(),
  reason: z.string().nullable(),
});
export type SyncChangeItem = z.infer<typeof syncChangeItemSchema>;

export const syncChangePageSchema = paginatedSchema(syncChangeItemSchema);
export type SyncChangePage = z.infer<typeof syncChangePageSchema>;
