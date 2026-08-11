import { Loader2 } from 'lucide-react';

import type { SyncProgress } from '@/features/sync/schemas';
import { phaseLabels } from '@/shared/constants/labels';

function progressText(progress: SyncProgress | null): string {
  if (progress === null) return '업데이트 진행 중';
  return `업데이트 진행 중 · ${phaseLabels[progress.phase]}`;
}

export function SyncProgressText({ progress }: { progress: SyncProgress | null }) {
  return (
    <p className="mt-4 flex items-center gap-2 text-body text-warning-text">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      {progressText(progress)}
    </p>
  );
}
