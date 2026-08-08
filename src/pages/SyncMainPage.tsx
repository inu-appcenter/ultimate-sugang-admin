import { useState } from 'react';

import { DisplaySemesterCard } from '@/features/semester/components/DisplaySemesterCard';
import { CourseSummaryCard } from '@/features/sync/components/CourseSummaryCard';
import { SyncJobTable } from '@/features/sync/components/SyncJobTable';

export function SyncMainPage() {
  const [page, setPage] = useState(1);

  return (
    <div>
      <h1 className="mb-6 text-h1 text-foreground">강의 데이터 관리</h1>

      <div className="flex flex-col gap-6">
        <DisplaySemesterCard />
        <CourseSummaryCard
          onUpdateClick={() => {
          }}
        />
        <SyncJobTable page={page} onPageChange={setPage} />
      </div>
    </div>
  );
}
