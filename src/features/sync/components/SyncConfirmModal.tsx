import { Loader2 } from 'lucide-react';

import { isSyncConflictError, useCreateSyncJob } from '@/features/sync/queries';
import type { SemesterRef } from '@/features/sync/schemas';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import type { SyncStrategy } from '@/shared/api/schemas';
import { formatSemesterLong } from '@/shared/lib/formatSemester';

const CONFIRM_COPY = {
  UPSERT: {
    title: '데이터를 갱신할까요?',
    lead: '최신 상태로 갱신할게요.',
    notes: [
      '새로 생긴 과목은 추가돼요.',
      '바뀐 과목은 수정돼요.',
      '사라진 과목은 폐강 처리돼요.',
      '장바구니·수강신청은 그대로예요.',
    ],
    action: '갱신',
  },
  INITIAL: {
    title: '데이터를 적재할까요?',
    lead: '새로 적재할게요.',
    notes: [],
    action: '적재',
  },
} as const;

interface SyncConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: SemesterRef;
  strategy: Exclude<SyncStrategy, 'REPLACE'>;
}

export function SyncConfirmModal({
  open,
  onOpenChange,
  target,
  strategy,
}: SyncConfirmModalProps) {
  const copy = CONFIRM_COPY[strategy];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {`${formatSemesterLong(target.academicYear, target.term)} 데이터를 ${copy.lead}`}
          </DialogDescription>
        </DialogHeader>

        {copy.notes.length > 0 && (
          <ul className="flex flex-col gap-1">
            {copy.notes.map((note) => (
              <li key={note} className="text-caption text-fg-secondary">
                {`· ${note}`}
              </li>
            ))}
          </ul>
        )}

        <ConfirmActions
          target={target}
          strategy={strategy}
          actionLabel={copy.action}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConfirmActions({
  target,
  strategy,
  actionLabel,
  onClose,
}: {
  target: SemesterRef;
  strategy: Exclude<SyncStrategy, 'REPLACE'>;
  actionLabel: string;
  onClose: () => void;
}) {
  const { mutate, isPending } = useCreateSyncJob();

  const launch = () => {
    mutate(
      { ...target, expectedStrategy: strategy },
      {
        onSuccess: onClose,
        onError: (error) => {
          if (isSyncConflictError(error)) onClose();
        },
      },
    );
  };

  return (
    <DialogFooter>
      <Button variant="outline" onClick={onClose} disabled={isPending}>
        취소
      </Button>
      <Button onClick={launch} disabled={isPending}>
        {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
        {actionLabel}
      </Button>
    </DialogFooter>
  );
}
