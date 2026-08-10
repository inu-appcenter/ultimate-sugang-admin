import {
  queryOptions,
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  createSyncJob,
  fetchCoursesSummary,
  fetchSyncChanges,
  fetchSyncJob,
  fetchSyncJobs,
  requestSyncPreflight,
} from '@/features/sync/api';
import type { SyncChangeType } from '@/features/sync/schemas';
import { getErrorCode } from '@/shared/api/errorHandler';
import { ERROR_CODE } from '@/shared/constants/errorCodes';

const POLL_INTERVAL_MS = 2000;

export const syncKeys = {
  all: ['sync'] as const,
  summary: () => [...syncKeys.all, 'summary'] as const,
  jobList: () => [...syncKeys.all, 'jobs'] as const,
  jobs: (page: number) => [...syncKeys.jobList(), page] as const,
  job: (jobId: number | null) => [...syncKeys.all, 'job', jobId] as const,
  changes: (jobId: number, changeType: SyncChangeType) =>
    [...syncKeys.job(jobId), 'changes', changeType] as const,
};

const syncJobQuery = (jobId: number | null) =>
  queryOptions({
    queryKey: syncKeys.job(jobId),
    queryFn: jobId === null ? skipToken : () => fetchSyncJob(jobId),
    refetchInterval: (query) =>
      query.state.data?.status === 'RUNNING' ? POLL_INTERVAL_MS : false,
    meta: { skipErrorToast: true },
  });

export function useCoursesSummary() {
  return useQuery({
    queryKey: syncKeys.summary(),
    queryFn: fetchCoursesSummary,
  });
}

export function useSyncPreflight() {
  return useMutation({ mutationFn: requestSyncPreflight });
}

export function isSyncConflictError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === ERROR_CODE.SYNC_JOB_ALREADY_RUNNING || code === ERROR_CODE.SYNC_STRATEGY_MISMATCH;
}

export function useCreateSyncJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSyncJob,
    onSettled: () => queryClient.invalidateQueries({ queryKey: syncKeys.all }),
  });
}

export function useSyncJob(jobId: number | null) {
  return useQuery(syncJobQuery(jobId));
}

export function useSyncChanges(jobId: number, changeType: SyncChangeType) {
  return useInfiniteQuery({
    queryKey: syncKeys.changes(jobId, changeType),
    queryFn: ({ pageParam }) => fetchSyncChanges(jobId, changeType, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.page + 1 : undefined),
  });
}

export function useSyncJobPolling(
  runningJobId: number | null,
  onJobFailed: (jobId: number) => void,
) {
  const queryClient = useQueryClient();
  const settledJobIds = useRef(new Set<number>());
  const [launchedJobId, setLaunchedJobId] = useState<number | null>(null);

  const jobId = runningJobId ?? launchedJobId;

  const query = useQuery(syncJobQuery(jobId));

  const job = query.data;

  useEffect(() => {
    if (job === undefined || job.status === 'RUNNING') return;
    if (settledJobIds.current.has(job.jobId)) return;
    settledJobIds.current.add(job.jobId);

    if (job.status === 'SUCCESS') {
      toast.success('업데이트를 마쳤어요.');
    } else {
      toast.error('업데이트에 실패했어요. 이력에서 사유를 확인해주세요.');
      onJobFailed(job.jobId);
    }

    setLaunchedJobId(null);
    void queryClient.invalidateQueries({ queryKey: syncKeys.summary() });
    void queryClient.invalidateQueries({ queryKey: syncKeys.jobList() });
  }, [job, onJobFailed, queryClient]);

  return { job, launchedJobId, trackLaunchedJob: setLaunchedJobId };
}

export function useSyncJobs(page: number) {
  return useQuery({
    queryKey: syncKeys.jobs(page),
    queryFn: () => fetchSyncJobs(page),
    placeholderData: (previous) => previous,
  });
}
