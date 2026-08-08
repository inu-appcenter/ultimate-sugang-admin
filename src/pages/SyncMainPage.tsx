import { useState } from 'react';

import { DisplaySemesterCard } from '@/features/semester/components/DisplaySemesterCard';
import { useDisplaySemester } from '@/features/semester/queries';
import { CourseSummaryCard } from '@/features/sync/components/CourseSummaryCard';
import { SyncJobTable } from '@/features/sync/components/SyncJobTable';
import { SyncTargetModal } from '@/features/sync/components/SyncTargetModal';
import { useCoursesSummary } from '@/features/sync/queries';

export function SyncMainPage() {
  const [page, setPage] = useState(1);
  const [targetOpen, setTargetOpen] = useState(false);

  const { data: displaySemester } = useDisplaySemester();
  const { data: summary } = useCoursesSummary();

  const loadedSemester = summary?.semester ?? null;
  const initialTarget = loadedSemester ?? displaySemester ?? null;

  return (
    <div>
      <h1 className="mb-6 text-h1 text-foreground">강의 데이터 관리</h1>

      <div className="flex flex-col gap-6">
        <DisplaySemesterCard />
        <CourseSummaryCard
          targetReady={initialTarget !== null}
          onUpdateClick={() => setTargetOpen(true)}
        />
        <SyncJobTable page={page} onPageChange={setPage} />
      </div>

      {initialTarget !== null && (
        <SyncTargetModal
          open={targetOpen}
          onOpenChange={setTargetOpen}
          initialTarget={initialTarget}
          loadedSemester={loadedSemester}
          onPreflight={() => setTargetOpen(false)}
        />
      )}
    </div>
  );
}
