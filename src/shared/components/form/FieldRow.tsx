import type { ReactNode } from 'react';

import { Label } from '@/shared/components/ui/label';

interface FieldRowProps {
  id: string;
  label: string;
  children: ReactNode;
}

export function FieldRow({ id, label, children }: FieldRowProps) {
  return (
    <div className="flex items-center gap-4">
      <Label htmlFor={id} className="w-12 shrink-0">
        {label}
      </Label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
