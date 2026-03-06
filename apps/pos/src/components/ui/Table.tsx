import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-auto rounded-lg border border-pos-border', className)}>
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

export function TableHeader({ children, className }: TableProps) {
  return (
    <thead className={cn('bg-pos-surface text-xs uppercase text-gray-400 border-b border-pos-border', className)}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className }: TableProps) {
  return <tbody className={cn('divide-y divide-pos-border', className)}>{children}</tbody>;
}

export function TableRow({ children, className }: TableProps) {
  return (
    <tr className={cn('hover:bg-pos-hover transition-colors', className)}>
      {children}
    </tr>
  );
}

interface TableCellProps extends TableProps {
  align?: 'left' | 'center' | 'right';
}

export function TableHead({ children, className, align = 'left' }: TableCellProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 font-medium whitespace-nowrap',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className, align = 'left' }: TableCellProps) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-gray-300 whitespace-nowrap',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {children}
    </td>
  );
}

interface EmptyTableProps {
  colSpan: number;
  message?: string;
  icon?: ReactNode;
}

export function EmptyTable({ colSpan, message = 'No data found', icon }: EmptyTableProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        {icon && <div className="text-gray-500 mb-2 flex justify-center">{icon}</div>}
        <p className="text-gray-500 text-sm">{message}</p>
      </td>
    </tr>
  );
}
