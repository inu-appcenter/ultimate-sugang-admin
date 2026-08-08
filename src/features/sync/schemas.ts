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
