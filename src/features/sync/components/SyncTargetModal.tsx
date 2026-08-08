import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';

import { useSyncPreflight } from '@/features/sync/queries';
import { semesterRefSchema, type SemesterRef, type SyncPreflight } from '@/features/sync/schemas';
import { FieldRow } from '@/shared/components/form/FieldRow';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { TERM_ORDER, termLabels } from '@/shared/constants/labels';
import { academicYearOptions } from '@/shared/lib/academicYearOptions';
import { formatSemesterLong } from '@/shared/lib/formatSemester';

const YEAR_FIELD_ID = 'sync-target-year';
const TERM_FIELD_ID = 'sync-target-term';

interface SyncTargetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTarget: SemesterRef;
  loadedSemester: SemesterRef | null;
  onPreflight: (preflight: SyncPreflight) => void;
}

export function SyncTargetModal({
  open,
  onOpenChange,
  initialTarget,
  loadedSemester,
  onPreflight,
}: SyncTargetModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>데이터 업데이트</DialogTitle>
          <DialogDescription>적재할 학기를 골라주세요.</DialogDescription>
        </DialogHeader>
        <SyncTargetForm
          initialTarget={initialTarget}
          loadedSemester={loadedSemester}
          onPreflight={onPreflight}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function SyncTargetForm({
  initialTarget,
  loadedSemester,
  onPreflight,
  onClose,
}: {
  initialTarget: SemesterRef;
  loadedSemester: SemesterRef | null;
  onPreflight: (preflight: SyncPreflight) => void;
  onClose: () => void;
}) {
  const { control, handleSubmit } = useForm<SemesterRef>({
    resolver: zodResolver(semesterRefSchema),
    defaultValues: initialTarget,
  });
  const { mutate, isPending } = useSyncPreflight();

  const submit = handleSubmit((target) => {
    mutate(target, { onSuccess: onPreflight });
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FieldRow id={YEAR_FIELD_ID} label="연도">
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

      <FieldRow id={TERM_FIELD_ID} label="학기">
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

      {loadedSemester !== null && (
        <div className="flex items-center gap-4 text-caption">
          <span className="w-12 shrink-0 whitespace-nowrap text-fg-secondary">현재 적재</span>
          <span className="text-foreground">
            {formatSemesterLong(loadedSemester.academicYear, loadedSemester.term)}
          </span>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
          다음
        </Button>
      </DialogFooter>
    </form>
  );
}
