import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * 배경은 Primary 가 아니라 `bg-foreground` 다 — Primary 는 CTA·활성 탭에만 쓰고
 * 화면의 5~10%를 넘기지 않는다 (DS-01 §1-1). 안내용 말풍선은 명도로 처리한다.
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-btn bg-foreground px-3 py-1.5 text-caption text-primary-foreground shadow-card duration-200',
        'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
