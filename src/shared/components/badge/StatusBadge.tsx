import { Badge } from '@/shared/components/ui/badge';
import { jobStatusVariant, strategyVariant } from '@/shared/constants/badgeVariants';
import { jobStatusLabels, strategyLabels } from '@/shared/constants/labels';
import type { SyncJobStatus, SyncStrategy } from '@/shared/api/schemas';

export function JobStatusBadge({ status }: { status: SyncJobStatus }) {
  return <Badge variant={jobStatusVariant[status]}>{jobStatusLabels[status]}</Badge>;
}

export function StrategyBadge({ strategy }: { strategy: SyncStrategy }) {
  return <Badge variant={strategyVariant[strategy]}>{strategyLabels[strategy]}</Badge>;
}
