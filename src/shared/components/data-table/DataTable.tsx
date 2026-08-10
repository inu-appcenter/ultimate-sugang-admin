import { Fragment, type KeyboardEvent, type ReactNode } from 'react';

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
  width: number;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T, K extends string | number> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => K;
  expandedKey?: K | null;
  onRowToggle?: (key: K) => void;
  renderExpanded?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T, K extends string | number>({
  columns,
  rows,
  rowKey,
  expandedKey = null,
  onRowToggle,
  renderExpanded,
  className,
}: DataTableProps<T, K>) {
  return (
    <Table className={className}>
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
          const key = rowKey(row);
          const expanded = expandedKey === key;
          const toggle = onRowToggle === undefined ? undefined : () => onRowToggle(key);

          return (
            <Fragment key={key}>
              <TableRow
                className={cn(toggle !== undefined && 'cursor-pointer hover:bg-hover')}
                {...(toggle === undefined
                  ? {}
                  : {
                      role: 'button',
                      tabIndex: 0,
                      'aria-expanded': expanded,
                      onClick: toggle,
                      onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        toggle();
                      },
                    })}
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

              {expanded && renderExpanded !== undefined && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-auto px-3 pb-6 pt-2 align-top">
                    <div className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
                      {renderExpanded(row)}
                    </div>
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
