import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

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
