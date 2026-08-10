import { FieldDiff } from '@/features/sync/components/FieldDiff';
import { useSyncChanges } from '@/features/sync/queries';
import type { SyncChangeItem, SyncChangeType } from '@/features/sync/schemas';
import { getErrorMessage } from '@/shared/api/errorHandler';
import { DataTable, type DataTableColumn } from '@/shared/components/data-table/DataTable';
import { EmptyState } from '@/shared/components/states/EmptyState';
import { ErrorState } from '@/shared/components/states/ErrorState';
import { LoadingSkeleton } from '@/shared/components/states/LoadingSkeleton';
import { Button } from '@/shared/components/ui/button';

const haksuCodeColumn: DataTableColumn<SyncChangeItem> = {
  key: 'haksuCode',
  header: '학수번호',
  width: 140,
  render: (item) => <span className="font-mono">{item.haksuCode}</span>,
};

const courseNameColumn: DataTableColumn<SyncChangeItem> = {
  key: 'courseName',
  header: '과목명',
  width: 260,
  render: (item) => item.courseName ?? '-',
};

const changedFieldsColumn: DataTableColumn<SyncChangeItem> = {
  key: 'changedFields',
  header: '변경 내용',
  width: 340,
  render: (item) => (item.changedFields === null ? '-' : <FieldDiff fields={item.changedFields} />),
};

const reasonColumn: DataTableColumn<SyncChangeItem> = {
  key: 'reason',
  header: '사유',
  width: 600,
  render: (item) => item.reason ?? '-',
};

const columnsOf = (changeType: SyncChangeType): Array<DataTableColumn<SyncChangeItem>> => {
  if (changeType === 'WARNING') return [haksuCodeColumn, reasonColumn];
  if (changeType === 'UPDATED') return [haksuCodeColumn, courseNameColumn, changedFieldsColumn];
  return [haksuCodeColumn, { ...courseNameColumn, width: 600 }];
};

export function SyncChangeList({
  jobId,
  changeType,
}: {
  jobId: number;
  changeType: SyncChangeType;
}) {
  const { data, isPending, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSyncChanges(jobId, changeType);

  if (isPending) return <LoadingSkeleton rows={3} className="mt-4" />;
  if (isError) return <ErrorState message={getErrorMessage(error)} />;

  const items = data.pages.flatMap((page) => page.content);
  if (items.length === 0) return <EmptyState message="항목이 없어요." />;

  return (
    <div className="mt-2">
      <DataTable
        columns={columnsOf(changeType)}
        rows={items}
        rowKey={(item) => item.haksuCode}
        className="[&_td]:h-auto [&_td]:py-3 [&_td]:align-top"
      />
      {hasNextPage && (
        <div className="mt-2 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            더 보기
          </Button>
        </div>
      )}
    </div>
  );
}
