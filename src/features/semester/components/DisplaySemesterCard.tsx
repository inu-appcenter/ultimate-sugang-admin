import { useDisplaySemester } from '@/features/semester/queries';
import { getErrorMessage } from '@/shared/api/errorHandler';
import { ErrorState } from '@/shared/components/states/ErrorState';
import { LoadingSkeleton } from '@/shared/components/states/LoadingSkeleton';
import { Button } from '@/shared/components/ui/button';
import { Card, CardTitle } from '@/shared/components/ui/card';
import { formatSemesterLong } from '@/shared/lib/formatSemester';

/**
 * 카드 1 — 표시 학기 (01 §6-2).
 * ⚠️ 이 값과 카드 2의 적재 학기는 **달라도 정상**이다. 불일치 경고를 띄우지 않는다 (D10).
 */
export function DisplaySemesterCard({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { data, isPending, isError, error, refetch } = useDisplaySemester();

  return (
    <Card>
      <CardTitle>표시 학기</CardTitle>

      {isPending && <LoadingSkeleton rows={2} className="mt-4" />}

      {/* 재조회 실패 때는 Error State 를 띄우지 않는다 — 이미 있는 값을 계속 보여주고
          알림은 전역 토스트가 한다. 셋(카드 1·2·이력) 모두 같은 규칙이다. */}
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
