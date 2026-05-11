import { BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-surface-alt text-neutral-500">
        {icon ?? <BookOpen size={28} />}
      </div>
      <div>
        <p className="text-base font-bold text-white">{title}</p>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 rounded-full bg-brand-cyan px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
