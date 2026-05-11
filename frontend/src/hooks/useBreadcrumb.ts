import { useEffect } from 'react';
import { useBreadcrumbStore } from '@/store/breadcrumbStore';

export function useBreadcrumb(title: string | undefined | null) {
  const updateTailLabel = useBreadcrumbStore((s) => s.updateTailLabel);
  useEffect(() => {
    if (title) updateTailLabel(title);
  }, [title, updateTailLabel]);
}
