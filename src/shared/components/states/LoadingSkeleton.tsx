import { Skeleton } from '@/shared/components/ui/skeleton';

/**
 * DS-01 §5-6 — 회색 placeholder bar.
 * 행 수는 부르는 쪽이 정한다: 이력 테이블 5행 / 인라인 확장 3행 (01 §9).
 */
export function LoadingSkeleton({ rows, className }: { rows: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="mb-3 h-5 w-full last:mb-0" />
      ))}
    </div>
  );
}
