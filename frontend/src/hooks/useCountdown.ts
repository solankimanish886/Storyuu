import { useState, useEffect } from 'react';

/**
 * Returns the milliseconds remaining until targetDate.
 * Updates every second. Returns 0 once the target has passed.
 * Returns null if targetDate is null/undefined/invalid.
 */
export function useCountdown(targetDate: string | null | undefined): number | null {
  const target = targetDate ? new Date(targetDate).getTime() : null;

  const [remaining, setRemaining] = useState<number | null>(() => {
    if (target === null || isNaN(target)) return null;
    return Math.max(0, target - Date.now());
  });

  useEffect(() => {
    if (target === null || isNaN(target)) {
      setRemaining(null);
      return;
    }
    setRemaining(Math.max(0, target - Date.now()));
    const id = setInterval(() => {
      setRemaining(Math.max(0, target - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  return remaining;
}

export function formatHMS(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
