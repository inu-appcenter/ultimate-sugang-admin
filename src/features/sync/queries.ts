import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import {
  createSyncJob,
  fetchCoursesSummary,
  fetchSyncJob,
  fetchSyncJobs,
  requestSyncPreflight,
} from '@/features/sync/api';
import { getErrorCode } from '@/shared/api/errorHandler';
import { ERROR_CODE } from '@/shared/constants/errorCodes';

const POLL_INTERVAL_MS = 2000;

export const syncKeys = {
  all: ['sync'] as const,
  summary: () => [...syncKeys.all, 'summary'] as const,
  jobList: () => [...syncKeys.all, 'jobs'] as const,
  jobs: (page: number) => [...syncKeys.jobList(), page] as const,
  job: (jobId: number | null) => [...syncKeys.all, 'job', jobId] as const,
};

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

export function useSyncJobPolling(jobId: number | null) {
  const queryClient = useQueryClient();
  const settledJobId = useRef<number | null>(null);

  const query = useQuery({
    queryKey: syncKeys.job(jobId),
    queryFn: jobId === null ? skipToken : () => fetchSyncJob(jobId),
    refetchInterval: (query) =>
      query.state.data?.status === 'RUNNING' ? POLL_INTERVAL_MS : false,
  });

  const job = query.data;

  useEffect(() => {
    if (job === undefined || job.status === 'RUNNING') return;
    if (settledJobId.current === job.jobId) return;
    settledJobId.current = job.jobId;

    void queryClient.invalidateQueries({ queryKey: syncKeys.summary() });
    void queryClient.invalidateQueries({ queryKey: syncKeys.jobList() });

    if (job.status === 'SUCCESS') {
      toast.success('업데이트를 마쳤어요.');
    } else {
      toast.error('업데이트에 실패했어요. 이력에서 사유를 확인해주세요.');
    }
  }, [job, queryClient]);

  return query;
}

export function useSyncJobs(page: number) {
  return useQuery({
    queryKey: syncKeys.jobs(page),
    queryFn: () => fetchSyncJobs(page),
    placeholderData: (previous) => previous,
  });
}
