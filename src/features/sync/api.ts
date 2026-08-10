import {
  coursesSummarySchema,
  syncChangePageSchema,
  syncJobPageSchema,
  syncJobCreatedSchema,
  syncJobDetailSchema,
  syncPreflightSchema,
  type CoursesSummary,
  type SemesterRef,
  type SyncChangePage,
  type SyncChangeType,
  type SyncJobCreated,
  type SyncJobCreateRequest,
  type SyncJobDetail,
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

export async function fetchSyncJob(jobId: number): Promise<SyncJobDetail> {
  const { data } = await apiClient.get(`/sync/jobs/${jobId}`);
  return syncJobDetailSchema.parse(data);
}

export async function fetchSyncChanges(
  jobId: number,
  changeType: SyncChangeType,
  page: number,
): Promise<SyncChangePage> {
  const { data } = await apiClient.get(`/sync/jobs/${jobId}/details`, {
    params: { changeType, page },
  });
  return syncChangePageSchema.parse(data);
}

export async function createSyncJob(body: SyncJobCreateRequest): Promise<SyncJobCreated> {
  const { data } = await apiClient.post('/sync/jobs', body);
  return syncJobCreatedSchema.parse(data);
}
