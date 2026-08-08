import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * shadcn/ui Button 을 DS-01 로 맞춘 것.
 *  - radius 는 rounded-btn(10px). shadcn 기본 6px 를 쓰지 않는다 (DS-01 §4-1).
 *  - variant 는 DS-01 §5-5 의 4종뿐이다. secondary·link 는 USS 에 사용처가 없어 뺐다.
 *  - focus 는 ring-2 + primary-subtle, disabled 는 opacity 50 (DS-01 §6).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-subtle disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        outline: 'border border-border bg-surface text-foreground hover:bg-hover',
        ghost: 'text-fg-secondary hover:bg-hover hover:text-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-danger-bg/70',
      },
      size: {
        default: 'h-10 px-4 text-body',
        sm: 'h-8 px-3 text-caption',
        lg: 'h-11 px-6 text-body',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
