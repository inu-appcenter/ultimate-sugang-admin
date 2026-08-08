import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { isSyncConflictError, useCreateSyncJob } from '@/features/sync/queries';
import type { DeleteCounts, SyncPreflight } from '@/features/sync/schemas';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { formatNumber } from '@/shared/lib/formatNumber';
import { formatSemesterCompact, formatSemesterLong } from '@/shared/lib/formatSemester';

const CONFIRM_FIELD_ID = 'sync-replace-confirm';
const EXPECTED_TEXT_ID = 'sync-replace-expected';

const DELETE_LABELS: [keyof DeleteCounts, string][] = [
  ['courses', '강의'],
  ['schedules', '시간표'],
  ['carts', '장바구니'],
  ['registrations', '수강신청'],
];

interface SyncReplaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preflight: SyncPreflight;
}

export function SyncReplaceModal({ open, onOpenChange, preflight }: SyncReplaceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-modal-wide">
        <DialogHeader>
          <DialogTitle>기존 데이터를 모두 삭제합니다</DialogTitle>
        </DialogHeader>
        <ReplaceBody preflight={preflight} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ReplaceBody({ preflight, onClose }: { preflight: SyncPreflight; onClose: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  const { mutate, isPending } = useCreateSyncJob();

  const { currentSemester, targetSemester, deleteCounts, strategy } = preflight;
  const expected = formatSemesterCompact(targetSemester.academicYear, targetSemester.term);
  const canSubmit = confirmText === expected;

  const launch = () => {
    mutate(
      { ...targetSemester, expectedStrategy: strategy },
      {
        onSuccess: onClose,
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

      <div>
        <DialogDescription className="text-body text-foreground">
          다음 데이터가 영구 삭제됩니다.
        </DialogDescription>
        <dl className="mt-2 flex flex-col gap-1">
          {DELETE_LABELS.map(([key, label]) => (
            <div key={key} className="flex items-center gap-4">
              <dt className="shrink-0 text-caption text-fg-secondary">{label}</dt>
              <dd className="ml-auto text-body text-foreground">
                {`${formatNumber(deleteCounts[key])}건`}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="text-body text-danger-text">이 작업은 되돌릴 수 없습니다.</p>

      <div className="flex flex-col gap-2">
        <Label htmlFor={CONFIRM_FIELD_ID}>확인을 위해 아래를 입력하세요</Label>
        <p id={EXPECTED_TEXT_ID} className="font-mono text-body text-foreground">
          {expected}
        </p>
        <Input
          id={CONFIRM_FIELD_ID}
          aria-describedby={EXPECTED_TEXT_ID}
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
