import { AlertTriangle } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <AlertTriangle className="h-12 w-12 text-fg-disabled" aria-hidden />
      <p className="text-body text-fg-secondary">{message}</p>
      {onRetry !== undefined && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}
