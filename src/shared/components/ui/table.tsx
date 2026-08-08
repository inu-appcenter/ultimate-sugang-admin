import * as React from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * shadcn/ui Table 을 DS-01 로 맞춘 것.
 *  - 카드 안에 들어가므로 **바깥 보더가 없다.** 행 구분은 얇은 divider 뿐 (01 §6-4).
 *  - 카드는 여백을 키우지만 **테이블 내부는 밀도를 유지**한다 (DS-00 §5-3) — 행 높이는 표준 그대로.
 *  - 타이포는 헤더 caption / 셀 body (DS-01 §2).
 */
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full">
      <table ref={ref} className={cn('w-full text-body', className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <tbody ref={ref} className={cn(className)} {...props} />);
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn('border-b border-border last:border-0', className)}
      {...props}
    />
  ),
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn('h-10 px-3 text-left align-middle text-caption font-medium text-fg-secondary', className)}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn('h-12 px-3 align-middle text-foreground', className)} {...props} />
));
TableCell.displayName = 'TableCell';

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
