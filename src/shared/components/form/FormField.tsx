import type { ReactNode } from 'react';

import { FieldError } from '@/shared/components/form/FieldError';
import { Label } from '@/shared/components/ui/label';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

/** 라벨 + 입력 + 에러 caption 한 묶음. 입력 자체는 쓰는 쪽이 넣는다. */
export function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}
