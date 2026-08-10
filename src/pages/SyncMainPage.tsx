import { useState } from 'react';

import { DisplaySemesterCard } from '@/features/semester/components/DisplaySemesterCard';
import { useDisplaySemester } from '@/features/semester/queries';
import { CourseSummaryCard } from '@/features/sync/components/CourseSummaryCard';
import { SyncConfirmModal } from '@/features/sync/components/SyncConfirmModal';
import { SyncJobTable } from '@/features/sync/components/SyncJobTable';
import { SyncReplaceModal } from '@/features/sync/components/SyncReplaceModal';
import { SyncTargetModal } from '@/features/sync/components/SyncTargetModal';
import { useCoursesSummary, useSyncJobPolling } from '@/features/sync/queries';
import type { SyncPreflight } from '@/features/sync/schemas';

export function SyncMainPage() {
  const [page, setPage] = useState(1);
  const [targetOpen, setTargetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preflight, setPreflight] = useState<SyncPreflight | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  const { data: displaySemester } = useDisplaySemester();
  const { data: summary } = useCoursesSummary();

  const loadedSemester = summary?.semester ?? null;
  const initialTarget = loadedSemester ?? displaySemester ?? null;

  const { job, launchedJobId, trackLaunchedJob } = useSyncJobPolling(
    summary?.runningJobId ?? null,
    setExpandedJobId,
  );
  const jobRunning = (summary?.runningJobId ?? null) !== null || launchedJobId !== null;

  const openConfirm = (result: SyncPreflight) => {
    setTargetOpen(false);
    setPreflight(result);
    setConfirmOpen(true);
  };

  return (
    <div>
      <h1 className="mb-6 text-h1 text-foreground">강의 데이터 관리</h1>

      <div className="flex flex-col gap-6">
        <DisplaySemesterCard />
        <CourseSummaryCard
          targetReady={initialTarget !== null}
          jobRunning={jobRunning}
          runningProgress={job?.status === 'RUNNING' ? job.progress : null}
          onUpdateClick={() => setTargetOpen(true)}
        />
        <SyncJobTable
          page={page}
          onPageChange={setPage}
          expandedJobId={expandedJobId}
          onExpandToggle={(jobId) => setExpandedJobId((current) => (current === jobId ? null : jobId))}
        />
      </div>

      {initialTarget !== null && (
        <SyncTargetModal
          open={targetOpen}
          onOpenChange={setTargetOpen}
          initialTarget={initialTarget}
          loadedSemester={loadedSemester}
          onPreflight={openConfirm}
        />
      )}

      {preflight !== null &&
        (preflight.strategy === 'REPLACE' ? (
          <SyncReplaceModal
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            preflight={preflight}
            onLaunched={trackLaunchedJob}
          />
        ) : (
          <SyncConfirmModal
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            target={preflight.targetSemester}
            strategy={preflight.strategy}
            onLaunched={trackLaunchedJob}
          />
        ))}
    </div>
  );
}
