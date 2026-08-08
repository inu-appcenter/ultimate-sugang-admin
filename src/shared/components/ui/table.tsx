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
      {/* table-fixed 라야 colgroup 의 폭이 비율로 결정적으로 배분된다. auto 면 내용 길이에
          따라 컬럼이 흔들리는데, 폴링으로 카운트가 바뀌는 표에서는 특히 곤란하다. */}
      <table ref={ref} className={cn('w-full table-fixed text-body', className)} {...props} />
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

/**
 * ⚠️ 마지막 행의 divider 를 지우는 건 **여기서** 한다. TableRow 쪽에 last 변형으로 걸면
 * thead 의 tr 도 `:last-child` 라서 같이 걸리고, 특이도(0,2,0)가 헤더 divider 규칙(0,1,1)을
 * 이겨서 **헤더 아래 선이 통째로 사라진다.** 코드만 읽으면 멀쩡해 보이는 함정이다.
 */
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
));
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn('border-b border-border', className)} {...props} />
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
