import { useDisplaySemester } from '@/features/semester/queries';
import { getErrorMessage } from '@/shared/api/errorHandler';
import { ErrorState } from '@/shared/components/states/ErrorState';
import { LoadingSkeleton } from '@/shared/components/states/LoadingSkeleton';
import { Button } from '@/shared/components/ui/button';
import { Card, CardTitle } from '@/shared/components/ui/card';
import { formatSemesterLong } from '@/shared/lib/formatSemester';

export function DisplaySemesterCard({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { data, isPending, isError, error, refetch } = useDisplaySemester();

  return (
    <Card>
      <CardTitle>표시 학기</CardTitle>

      {isPending && <LoadingSkeleton rows={2} className="mt-4" />}

      {isError && data === undefined && (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      )}

      {data !== undefined && (
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-body text-foreground">
              {formatSemesterLong(data.academicYear, data.term)}
            </p>
            <p className="mt-1 text-caption text-fg-secondary">
              서비스 화면에 보이는 학기예요.
            </p>
          </div>
          <Button variant="outline" onClick={onOpenSettings}>
            학기 설정
          </Button>
        </div>
      )}
    </Card>
  );
}
