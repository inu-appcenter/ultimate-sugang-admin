import { Skeleton } from '@/shared/components/ui/skeleton';

export function LoadingSkeleton({ rows, className }: { rows: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="mb-3 h-5 w-full last:mb-0" />
      ))}
    </div>
  );
}
