import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { isSyncConflictError, useCreateSyncJob } from '@/features/sync/queries';
import type { SyncPreflight } from '@/features/sync/schemas';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { formatSemesterCompact, formatSemesterLong } from '@/shared/lib/formatSemester';

const CONFIRM_FIELD_ID = 'sync-replace-confirm';

interface SyncReplaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preflight: SyncPreflight;
  onLaunched: (jobId: number) => void;
}

export function SyncReplaceModal({
  open,
  onOpenChange,
  preflight,
  onLaunched,
}: SyncReplaceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-modal-wide">
        <DialogHeader>
          <DialogTitle>기존 데이터를 모두 삭제합니다</DialogTitle>
        </DialogHeader>
        <ReplaceBody
          preflight={preflight}
          onLaunched={onLaunched}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ReplaceBody({
  preflight,
  onLaunched,
  onClose,
}: {
  preflight: SyncPreflight;
  onLaunched: (jobId: number) => void;
  onClose: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const { mutate, isPending } = useCreateSyncJob();

  const { currentSemester, targetSemester, strategy } = preflight;
  const expected = formatSemesterCompact(targetSemester.academicYear, targetSemester.term);
  const canSubmit = confirmText === expected;

  const launch = () => {
    mutate(
      { ...targetSemester, expectedStrategy: strategy },
      {
        onSuccess: (created) => {
          onLaunched(created.jobId);
          onClose();
        },
        onError: (error) => {
          if (isSyncConflictError(error)) onClose();
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-1">
        {currentSemester !== null && (
          <SemesterRow
            label="현재"
            value={formatSemesterLong(currentSemester.academicYear, currentSemester.term)}
          />
        )}
        <SemesterRow
          label="변경"
          value={formatSemesterLong(targetSemester.academicYear, targetSemester.term)}
        />
      </dl>

      <p className="mt-4 text-center text-body text-danger-text">이 작업은 되돌릴 수 없습니다.</p>

      <div className="flex flex-col gap-2">
        <Label htmlFor={CONFIRM_FIELD_ID} className="block text-center">
          확인을 위해 ‘<span className="font-mono text-foreground">{expected}</span>’를 입력하세요
        </Label>
        <Input
          id={CONFIRM_FIELD_ID}
          className="font-mono"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          autoComplete="off"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          취소
        </Button>
        <Button variant="destructive" onClick={launch} disabled={!canSubmit || isPending}>
          {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
          삭제 후 적재
        </Button>
      </DialogFooter>
    </div>
  );
}

function SemesterRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <dt className="shrink-0 text-caption text-fg-secondary">{label}</dt>
      <dd className="text-body text-foreground">{value}</dd>
    </div>
  );
}
