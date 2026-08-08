import type { ReactNode } from 'react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

/**
 * DS-01 §5-6 Confirm Modal — 폭 400px, radius 16, shadow-modal. M1·M2·M3·M5 가 쓴다.
 * 실행 버튼 1개 + [취소](Outline) 원칙을 지킨다 (DS-01 §5-5).
 *
 * ⚠️ M4(REPLACE)는 이걸로 만들지 않는다 — 480px destructive Strict Match Modal 은 별도 컴포넌트다.
 * pending·disabled 같은 통로는 실제로 필요해지는 Step 에서 붙인다.
 */
export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = '취소',
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description !== undefined && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
