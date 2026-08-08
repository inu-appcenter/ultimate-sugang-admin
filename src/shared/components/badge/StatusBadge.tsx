import { Badge } from '@/shared/components/ui/badge';
import { jobStatusVariant, strategyVariant } from '@/shared/constants/badgeVariants';
import { jobStatusLabels, strategyLabels } from '@/shared/constants/labels';
import type { SyncJobStatus, SyncStrategy } from '@/shared/api/schemas';

/** DS-01 §6-2 — 성공 success / 실패 danger / 진행 중 warning. */
export function JobStatusBadge({ status }: { status: SyncJobStatus }) {
  return <Badge variant={jobStatusVariant[status]}>{jobStatusLabels[status]}</Badge>;
}

/** DS-01 §6-2 — 갱신·최초 muted / 교체 neutral-strong(색 대신 명도로 강조). */
export function StrategyBadge({ strategy }: { strategy: SyncStrategy }) {
  return <Badge variant={strategyVariant[strategy]}>{strategyLabels[strategy]}</Badge>;
}
