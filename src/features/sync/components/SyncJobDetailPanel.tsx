import { AlertTriangle } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { SyncChangeList } from '@/features/sync/components/SyncChangeList';
import { useSyncJobDetail } from '@/features/sync/queries';
import type { SyncChangeType, SyncJobDetail } from '@/features/sync/schemas';
import { getErrorMessage } from '@/shared/api/errorHandler';
import { ErrorState } from '@/shared/components/states/ErrorState';
import { LoadingSkeleton } from '@/shared/components/states/LoadingSkeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { CHANGE_TYPE_ORDER, changeTypeLabels } from '@/shared/constants/labels';
import { formatDuration } from '@/shared/lib/formatDuration';
import { formatNumber } from '@/shared/lib/formatNumber';

const hasItems = (count: number | null) => count !== null && count > 0;

const countsOf = (job: SyncJobDetail): Record<SyncChangeType, number | null> => ({
  CREATED: job.createdCount,
  UPDATED: job.updatedCount,
  CLOSED: job.closedCount,
  WARNING: job.warningCount,
});

const Dash = () => <span className="text-muted-ds-text">-</span>;

const countText = (value: number | null) =>
  value === null ? <Dash /> : `${formatNumber(value)}건`;

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-caption text-fg-secondary">{label}</span>
      <span className="text-caption text-foreground">{value}</span>
    </div>
  );
}

function JobMeta({ job }: { job: SyncJobDetail }) {
  const { fetchedCourseCount, fetchedScheduleCount } = job;
  const collected =
    fetchedCourseCount === null && fetchedScheduleCount === null ? null : (
      <>
        강의 {countText(fetchedCourseCount)} · 시간표 {countText(fetchedScheduleCount)}
      </>
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-8">
        <MetaItem label="실행자" value={job.executedBy} />
        <MetaItem
          label="소요"
          value={job.durationSeconds === null ? <Dash /> : formatDuration(job.durationSeconds)}
        />
        {job.partiallyApplied && <Badge variant="muted">부분 적용</Badge>}
      </div>
      {collected !== null && <MetaItem label="수집" value={collected} />}
    </div>
  );
}

function FailureBlock({ failureReason }: { failureReason: string | null }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-btn bg-danger-bg p-4">
        <p className="flex items-center gap-2 text-caption font-medium text-danger-text">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          실패 사유
        </p>
        {failureReason !== null && (
          <p className="mt-1 text-caption text-danger-text">{failureReason}</p>
        )}
      </div>
      <p className="text-body text-fg-secondary">변경 사항은 적용되지 않았어요.</p>
    </div>
  );
}

function ChangeTabs({ job }: { job: SyncJobDetail }) {
  const [selected, setSelected] = useState<SyncChangeType | null>(null);
  const counts = countsOf(job);
  const activeTab = selected ?? CHANGE_TYPE_ORDER.find((type) => hasItems(counts[type])) ?? 'CREATED';

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        const next = CHANGE_TYPE_ORDER.find((type) => type === value);
        if (next !== undefined) setSelected(next);
      }}
    >
      <TabsList>
        {CHANGE_TYPE_ORDER.map((type) => {
          const count = counts[type];
          return (
            <TabsTrigger
              key={type}
              id={`sync-change-tab-${type}`}
              value={type}
              disabled={!hasItems(count)}
            >
              {changeTypeLabels[type]}
              {count !== null && <span>{formatNumber(count)}</span>}
            </TabsTrigger>
          );
        })}
      </TabsList>
      <TabsContent value={activeTab}>
        <SyncChangeList jobId={job.jobId} changeType={activeTab} />
      </TabsContent>
    </Tabs>
  );
}

export function SyncJobDetailPanel({ jobId }: { jobId: number }) {
  const { data: job, isPending, isError, error } = useSyncJobDetail(jobId);

  if (isPending) return <LoadingSkeleton rows={3} />;
  if (isError) return <ErrorState message={getErrorMessage(error)} />;

  return (
    <div className="flex flex-col gap-4">
      <JobMeta job={job} />
      {job.status === 'FAILED' ? (
        <FailureBlock failureReason={job.failureReason} />
      ) : (
        <ChangeTabs job={job} />
      )}
    </div>
  );
}
