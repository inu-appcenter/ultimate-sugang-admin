import {
  coursesSummarySchema,
  syncJobPageSchema,
  type CoursesSummary,
  type SyncJobPage,
} from '@/features/sync/schemas';
import { apiClient } from '@/shared/api/client';

export async function fetchCoursesSummary(): Promise<CoursesSummary> {
  const { data } = await apiClient.get('/courses/summary');
  return coursesSummarySchema.parse(data);
}

export async function fetchSyncJobs(page: number): Promise<SyncJobPage> {
  const { data } = await apiClient.get('/sync/jobs', { params: { page } });
  return syncJobPageSchema.parse(data);
}
