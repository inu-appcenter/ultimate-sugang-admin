import {
  coursesSummarySchema,
  syncJobPageSchema,
  syncJobCreatedSchema,
  syncPreflightSchema,
  type CoursesSummary,
  type SemesterRef,
  type SyncJobCreated,
  type SyncJobCreateRequest,
  type SyncJobPage,
  type SyncPreflight,
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

export async function requestSyncPreflight(target: SemesterRef): Promise<SyncPreflight> {
  const { data } = await apiClient.post('/sync/preflight', target);
  return syncPreflightSchema.parse(data);
}

export async function createSyncJob(body: SyncJobCreateRequest): Promise<SyncJobCreated> {
  const { data } = await apiClient.post('/sync/jobs', body);
  return syncJobCreatedSchema.parse(data);
}
