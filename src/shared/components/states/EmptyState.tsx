import { Inbox } from 'lucide-react';

/** DS-01 §5-6 — 회색 아이콘 48px + 문구. 문구는 구어체다. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <Inbox className="h-12 w-12 text-fg-disabled" aria-hidden />
      <p className="text-body text-fg-secondary">{message}</p>
    </div>
  );
}
