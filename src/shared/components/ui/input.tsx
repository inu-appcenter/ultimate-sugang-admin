import * as React from 'react';

import { cn } from '@/shared/lib/cn';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-btn bg-hover px-3 text-body text-foreground transition-colors',
        'placeholder:text-muted-foreground',
        'focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-subtle',
        'aria-invalid:ring-2 aria-invalid:ring-danger-text',
        'disabled:cursor-not-allowed disabled:text-fg-disabled',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
