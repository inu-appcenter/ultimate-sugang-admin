import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * DS-01 §6-2 의 variant 만 둔다. shadcn 기본(default·secondary·destructive·outline)은
 * USS 에 대응하는 의미가 없어 뺐다.
 *
 * ⚠️ REPLACE(교체)가 neutral-strong 인 건 색을 늘리지 않고 **명도**로만 강조하기 때문이다
 * (DS-00 §4-1 원칙 4). `01 §6-4` 의 (info)/(accent) 표기는 DS-01 이 두 색을 제거하기 전
 * Gravit 서술이 남은 것이다.
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-btn px-2 py-0.5 text-caption font-medium',
  {
    variants: {
      variant: {
        success: 'bg-success-bg text-success-text',
        danger: 'bg-danger-bg text-danger-text',
        warning: 'bg-warning-bg text-warning-text',
        muted: 'bg-muted-ds-bg text-muted-ds-text',
        'neutral-strong': 'bg-foreground text-primary-foreground',
      },
    },
    defaultVariants: {
      variant: 'muted',
    },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
