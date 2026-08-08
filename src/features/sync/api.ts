import {
  coursesSummarySchema,
  syncJobPageSchema,
  type CoursesSummary,
  type SyncJobPage,
} from '@/features/sync/schemas';
import { apiClient } from '@/shared/api/client';

/** 03 §5-1. 진행 중 Job 식별(`runningJobId`)도 이 응답으로 한다. */
export async function fetchCoursesSummary(): Promise<CoursesSummary> {
  const { data } = await apiClient.get('/courses/summary');
  return coursesSummarySchema.parse(data);
}

/** 03 §6-3. `startedAt` 내림차순, 페이지 크기 10 고정(서버가 정한다 — size 파라미터가 없다). */
export async function fetchSyncJobs(page: number): Promise<SyncJobPage> {
  const { data } = await apiClient.get('/sync/jobs', { params: { page } });
  return syncJobPageSchema.parse(data);
}
