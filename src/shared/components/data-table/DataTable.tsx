import type { ReactNode } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { cn } from '@/shared/lib/cn';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** 01 §6-4 가 정한 px 폭. colgroup 으로 준다 — 색·간격·타이포 토큰과 다른 축이다. */
  width: number;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string | number;
}

/** 행 클릭 → 인라인 확장은 Step 6 에서 붙인다. 지금 필요 없는 통로는 만들어두지 않는다. */
export function DataTable<T>({ columns, rows, rowKey }: DataTableProps<T>) {
  return (
    <Table>
      <colgroup>
        {columns.map((column) => (
          <col key={column.key} style={{ width: `${column.width}px` }} />
        ))}
      </colgroup>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={cn(column.align === 'right' && 'text-right')}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={rowKey(row)}>
            {columns.map((column) => (
              <TableCell key={column.key} className={cn(column.align === 'right' && 'text-right')}>
                {column.render(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
