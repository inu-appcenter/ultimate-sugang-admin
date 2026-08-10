import type { ChangedField } from '@/features/sync/schemas';
import { fieldLabels } from '@/shared/constants/labels';

export function FieldDiff({ fields }: { fields: ChangedField[] }) {
  return (
    <div className="flex flex-col gap-2">
      {fields.map((change) => (
        <div key={change.field}>
          <p className="text-caption text-fg-secondary">
            {fieldLabels[change.field] ?? change.field}
          </p>
          <p className="text-caption text-foreground">{change.before}</p>
          <p className="text-caption text-foreground">→ {change.after}</p>
        </div>
      ))}
    </div>
  );
}
