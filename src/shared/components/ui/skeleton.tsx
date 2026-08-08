import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

/** DS-01 §5-6 — 회색 placeholder bar. shadcn 기본의 bg-primary/10(파란 기)을 bg-hover 로 바꿨다. */
function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-btn bg-hover', className)} {...props} />;
}

export { Skeleton };
