import { SyncProgressText } from '@/features/sync/components/SyncProgressText';
import { useCoursesSummary } from '@/features/sync/queries';
import type { CoursesSummary, SyncProgress } from '@/features/sync/schemas';
import { getErrorMessage } from '@/shared/api/errorHandler';
import { JobStatusBadge } from '@/shared/components/badge/StatusBadge';
import { ErrorState } from '@/shared/components/states/ErrorState';
import { LoadingSkeleton } from '@/shared/components/states/LoadingSkeleton';
import { Button } from '@/shared/components/ui/button';
import { Card, CardTitle } from '@/shared/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { formatDateTime } from '@/shared/lib/formatDateTime';
import { formatNumber } from '@/shared/lib/formatNumber';
import { formatSemesterLong } from '@/shared/lib/formatSemester';

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-caption text-fg-secondary">{label}</p>
      <p className="text-metric text-foreground">{formatNumber(value)}건</p>
    </div>
  );
}

function SummaryBody({ summary }: { summary: CoursesSummary }) {
  const { semester, courseCount, scheduleCount, lastJob } = summary;

  return (
    <>
      {semester === null ? (
        <p className="mt-4 text-body text-fg-secondary">아직 적재된 데이터가 없어요.</p>
      ) : (
        <>
          <p className="mt-4 text-body text-fg-secondary">
            {formatSemesterLong(semester.academicYear, semester.term)}
          </p>
          <div className="mt-2 flex gap-8">
            <Metric label="강의" value={courseCount} />
            <Metric label="시간표" value={scheduleCount} />
          </div>
        </>
      )}

      {lastJob === null ? (
        <p className="mt-6 text-caption text-muted-foreground">업데이트 이력이 없어요.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-caption text-muted-foreground">마지막 업데이트</span>
            <span className="text-caption text-foreground">
              {formatDateTime(lastJob.startedAt)}
            </span>
            <JobStatusBadge status={lastJob.status} />
          </div>
          {lastJob.createdCount !== null &&
            lastJob.updatedCount !== null &&
            lastJob.closedCount !== null && (
              <p className="text-caption text-muted-foreground">
                {`신규 ${formatNumber(lastJob.createdCount)} · 수정 ${formatNumber(lastJob.updatedCount)} · 폐강 ${formatNumber(lastJob.closedCount)}`}
              </p>
            )}
        </div>
      )}
    </>
  );
}

export function CourseSummaryCard({
  targetReady,
  jobRunning,
  runningProgress,
  onUpdateClick,
}: {
  targetReady: boolean;
  jobRunning: boolean;
  runningProgress: SyncProgress | null;
  onUpdateClick: () => void;
}) {
  const { data, isPending, isError, error, refetch } = useCoursesSummary();

  const blockedReason = jobRunning
    ? '업데이트가 진행 중이에요.'
    : targetReady
      ? null
      : '학기 정보를 불러온 뒤에 시작할 수 있어요.';

  return (
    <Card>
      <CardTitle>적재 데이터</CardTitle>

      {isPending && <LoadingSkeleton rows={3} className="mt-4" />}

      {isError && data === undefined && (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      )}

      {data !== undefined && (
        <>
          {jobRunning && <SyncProgressText progress={runningProgress} />}
          <SummaryBody summary={data} />
          <div className="mt-6 flex justify-end">
            {blockedReason !== null ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button disabled>데이터 업데이트</Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{blockedReason}</TooltipContent>
              </Tooltip>
            ) : (
              <Button onClick={onUpdateClick}>데이터 업데이트</Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
