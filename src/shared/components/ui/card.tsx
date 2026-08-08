import * as React from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * DS-01 §4-2 · §3 — 카드는 **보더 없이** bg-surface + shadow-card + radius 14, padding 24.
 * bg-page(연회색) 위 흰 표면과 아주 옅은 그림자로 층을 만든다. 진해지면 머티리얼 톤이 된다.
 *
 * shadcn 기본 Card 의 Header/Description/Content/Footer 는 뺐다 — USS 카드 3장이
 * 각자 다른 배치라 슬롯이 맞지 않고, 안 쓰는 API 만 남는다.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-card bg-surface p-6 shadow-card', className)} {...props} />
  ),
);
Card.displayName = 'Card';

/** 카드 타이틀은 h2(18/SemiBold) — DS-01 §2. */
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn('text-h2 text-foreground', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export { Card, CardTitle };
