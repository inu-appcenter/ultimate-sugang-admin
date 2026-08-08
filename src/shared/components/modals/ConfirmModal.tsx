import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** 본문. 목록·강조 문구처럼 description 한 줄로 안 되는 경우에 쓴다. */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'destructive';
  /** 실행 버튼을 끌 조건. M4 Strict Match 처럼 입력이 맞아야 켜지는 경우에 쓴다. */
  confirmDisabled?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
}

/**
 * DS-01 §5-6 Confirm Modal — 폭 400px, radius 16, shadow-modal.
 * 실행 버튼 1개 + [취소](Outline) 원칙을 지킨다 (DS-01 §5-5).
 */
export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = '취소',
  confirmVariant = 'default',
  confirmDisabled = false,
  isPending = false,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description !== undefined && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={confirmDisabled || isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
