import * as React from 'react';

import { cn } from '@/shared/lib/cn';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-card bg-surface p-6 shadow-card', className)} {...props} />
  ),
);
Card.displayName = 'Card';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn('text-h2 text-foreground', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export { Card, CardTitle };
