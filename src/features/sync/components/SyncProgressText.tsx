import { Loader2 } from 'lucide-react';

import type { SyncProgress } from '@/features/sync/schemas';
import { phaseLabels } from '@/shared/constants/labels';
import { formatNumber } from '@/shared/lib/formatNumber';

function progressText(progress: SyncProgress): string {
  const label = phaseLabels[progress.phase];
  if (progress.total === null) return `${label} 중…`;

  const unit = progress.phase === 'PERSIST' ? '건' : ' 페이지';
  return `${label} ${formatNumber(progress.current)}/${formatNumber(progress.total)}${unit}`;
}

export function SyncProgressText({ progress }: { progress: SyncProgress | null }) {
  return (
    <p className="mt-4 flex items-center gap-2 text-body text-warning-text">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      {progress === null ? '업데이트 진행 중' : `업데이트 진행 중 · ${progressText(progress)}`}
    </p>
  );
}
