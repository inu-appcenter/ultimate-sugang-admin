import { Inbox } from 'lucide-react';

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <Inbox className="h-12 w-12 text-fg-disabled" aria-hidden />
      <p className="text-body text-fg-secondary">{message}</p>
    </div>
  );
}
