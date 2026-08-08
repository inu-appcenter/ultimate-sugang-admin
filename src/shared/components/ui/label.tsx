import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

/** DS-01 §2 — 폼 라벨은 body(15/Regular), 보조 톤. */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    // shadcn 기본의 peer-disabled:* 는 뺐다 — 라벨이 입력창 앞에 오는 구조라 peer 매칭이 성립하지 않는다.
    className={cn('text-body text-fg-secondary', className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
