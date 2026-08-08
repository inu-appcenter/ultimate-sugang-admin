import { useSyncJobs } from '@/features/sync/queries';
import type { SyncJobListItem } from '@/features/sync/schemas';
import { getErrorMessage } from '@/shared/api/errorHandler';
import { JobStatusBadge, StrategyBadge } from '@/shared/components/badge/StatusBadge';
import { DataTable, type DataTableColumn } from '@/shared/components/data-table/DataTable';
import { PaginationControl } from '@/shared/components/data-table/PaginationControl';
import { EmptyState } from '@/shared/components/states/EmptyState';
import { ErrorState } from '@/shared/components/states/ErrorState';
import { LoadingSkeleton } from '@/shared/components/states/LoadingSkeleton';
import { Card, CardTitle } from '@/shared/components/ui/card';
import { formatNumber } from '@/shared/lib/formatNumber';
import { formatSemesterCompact } from '@/shared/lib/formatSemester';
import { formatShortDateTime } from '@/shared/lib/formatDateTime';

/**
 * 카운트는 SUCCESS 가 아니면 null 이다.
 * null 을 0 으로 덮지 않는다 — 둘은 뜻이 다르다. 화면에는 `-` 로 보여준다 (04 §9-1).
 */
const countCell = (value: number | null) => (value === null ? '-' : formatNumber(value));

/** 01 §6-4 가 정한 컬럼 폭(px). 합계 640 이라 콘텐츠 1024 안에 여유롭게 들어간다. */
const columns: Array<DataTableColumn<SyncJobListItem>> = [
  {
    key: 'startedAt',
    header: '일시',
    width: 150,
    render: (job) => formatShortDateTime(job.startedAt),
  },
  {
    key: 'semester',
    header: '대상 학기',
    width: 120,
    render: (job) => formatSemesterCompact(job.academicYear, job.term),
  },
  {
    key: 'strategy',
    header: '방식',
    width: 80,
    render: (job) => <StrategyBadge strategy={job.strategy} />,
  },
  {
    key: 'status',
    header: '상태',
    width: 80,
    render: (job) => <JobStatusBadge status={job.status} />,
  },
  { key: 'created', header: '신규', width: 70, align: 'right', render: (j) => countCell(j.createdCount) },
  { key: 'updated', header: '수정', width: 70, align: 'right', render: (j) => countCell(j.updatedCount) },
  { key: 'closed', header: '폐강', width: 70, align: 'right', render: (j) => countCell(j.closedCount) },
];

interface SyncJobTableProps {
  page: number;
  onPageChange: (page: number) => void;
}

/**
 * 이력 테이블 (01 §6-4). 테이블도 **카드로 감싸되** 안쪽 행 높이는 표준을 지킨다 (DS-00 §5-3).
 * 행 클릭 → 인라인 확장은 Step 6 에서 붙인다.
 */
export function SyncJobTable({ page, onPageChange }: SyncJobTableProps) {
  const { data, isPending, isError, error, refetch } = useSyncJobs(page);

  return (
    <Card>
      <CardTitle>업데이트 이력</CardTitle>

      {isPending && <LoadingSkeleton rows={5} className="mt-4" />}

      {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />}

      {data !== undefined &&
        (data.content.length === 0 ? (
          <EmptyState message="업데이트 이력이 없어요." />
        ) : (
          <div className="mt-4">
            <DataTable columns={columns} rows={data.content} rowKey={(job) => job.jobId} />
            <PaginationControl
              page={data.page}
              totalPages={data.totalPages}
              onChange={onPageChange}
            />
          </div>
        ))}
    </Card>
  );
}
