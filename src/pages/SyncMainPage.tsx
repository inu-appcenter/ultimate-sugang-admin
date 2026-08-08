import { useState } from 'react';

import { DisplaySemesterCard } from '@/features/semester/components/DisplaySemesterCard';
import { CourseSummaryCard } from '@/features/sync/components/CourseSummaryCard';
import { SyncJobTable } from '@/features/sync/components/SyncJobTable';

/**
 * SYNC_MAIN — 01 §6. 페이지는 얇게 두고 카드 3장이 각자 자기 데이터를 가져온다 (04 §10-1).
 * 모달(M1·M2)·폴링·인라인 확장은 Step 5·6 에서 붙는다.
 */
export function SyncMainPage() {
  const [page, setPage] = useState(1);

  return (
    <div>
      <h1 className="mb-6 text-h1 text-foreground">강의 데이터 관리</h1>

      <div className="flex flex-col gap-6">
        <DisplaySemesterCard
          onOpenSettings={() => {
            // Step 5-1 에서 M1(학기 설정)을 연다.
          }}
        />
        <CourseSummaryCard
          onUpdateClick={() => {
            // Step 5-2 에서 M2(대상 학기 선택)를 연다.
          }}
        />
        <SyncJobTable page={page} onPageChange={setPage} />
      </div>
    </div>
  );
}
