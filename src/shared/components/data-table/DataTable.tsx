import { Fragment, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

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
  onRowClick?: (row: T) => void;
  /** 행 아래에 붙일 것(인라인 확장). Step 6 에서 쓴다. */
  renderRowDetail?: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  renderRowDetail,
}: DataTableProps<T>) {
  const clickable = onRowClick !== undefined;

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
        {rows.map((row) => {
          const detail = renderRowDetail?.(row);
          return (
            <Fragment key={rowKey(row)}>
              <TableRow
                onClick={clickable ? () => onRowClick(row) : undefined}
                className={cn(clickable && 'cursor-pointer hover:bg-hover')}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(column.align === 'right' && 'text-right')}
                  >
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
              {detail !== undefined && detail !== null && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-auto p-0">
                    {detail}
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
