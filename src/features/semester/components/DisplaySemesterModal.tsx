import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useUpdateDisplaySemester } from '@/features/semester/queries';
import { displaySemesterSchema, type DisplaySemester } from '@/features/semester/schemas';
import { showErrorToast } from '@/shared/api/errorHandler';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { TERM_ORDER, termLabels } from '@/shared/constants/labels';
import { academicYearOptions } from '@/shared/lib/academicYearOptions';

const YEAR_FIELD_ID = 'display-semester-year';
const TERM_FIELD_ID = 'display-semester-term';

interface DisplaySemesterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: DisplaySemester;
}

export function DisplaySemesterModal({ open, onOpenChange, current }: DisplaySemesterModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>표시 학기 설정</DialogTitle>
          <DialogDescription>
            서비스 화면에 보이는 학기예요.
            <br />
            강의 데이터에는 영향을 주지 않아요.
          </DialogDescription>
        </DialogHeader>
        <DisplaySemesterForm current={current} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function DisplaySemesterForm({
  current,
  onClose,
}: {
  current: DisplaySemester;
  onClose: () => void;
}) {
  const { control, handleSubmit, formState } = useForm<DisplaySemester>({
    resolver: zodResolver(displaySemesterSchema),
    defaultValues: current,
  });
  const { mutate, isPending } = useUpdateDisplaySemester();

  const submit = handleSubmit((values) => {
    mutate(values, {
      onSuccess: () => {
        toast.success('표시 학기를 변경했어요.');
        onClose();
      },
      onError: showErrorToast,
    });
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FieldRow htmlFor={YEAR_FIELD_ID} label="연도">
        <Controller
          control={control}
          name="academicYear"
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={(value) => field.onChange(Number(value))}
            >
              <SelectTrigger id={YEAR_FIELD_ID} ref={field.ref}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {academicYearOptions().map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldRow>

      <FieldRow htmlFor={TERM_FIELD_ID} label="학기">
        <Controller
          control={control}
          name="term"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={TERM_FIELD_ID} ref={field.ref}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERM_ORDER.map((term) => (
                  <SelectItem key={term} value={term}>
                    {termLabels[term]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldRow>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" disabled={!formState.isDirty || isPending}>
          저장
        </Button>
      </DialogFooter>
    </form>
  );
}

function FieldRow({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <Label htmlFor={htmlFor} className="w-12 shrink-0">
        {label}
      </Label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
