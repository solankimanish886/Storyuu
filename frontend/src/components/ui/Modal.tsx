import { useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  onClose,
  children,
  labelId,
  maxWidth = 'max-w-[480px]',
}: {
  onClose: () => void;
  children: React.ReactNode;
  labelId?: string;
  maxWidth?: string;
}) {
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc to close
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop - darker and more visible */}
      <div 
        className="absolute inset-0 h-full w-full bg-black/75 backdrop-blur-sm"
        onClick={() => onCloseRef.current()}
      />

      {/* Modal Container */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        onKeyDown={handleKeyDown}
        className={`relative z-[101] flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-[20px] border border-white/[0.05] bg-admin-surface-alt shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-[0.95] opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared class constants
// ---------------------------------------------------------------------------

export const MODAL_LABEL_CLS =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/40';

export const MODAL_INPUT_CLS =
  'w-full rounded-xl border border-white/[0.05] bg-admin-bg px-4 h-14 text-sm text-white placeholder:text-white/20 transition-all focus:border-brand-cyan/50 focus:bg-admin-bg/80 focus:outline-none';

export const MODAL_CANCEL_CLS =
  'h-12 rounded-xl px-6 text-sm font-bold text-white/30 transition-colors hover:text-white hover:bg-white/5';

export const MODAL_PRIMARY_CLS =
  'relative h-12 min-w-[160px] overflow-hidden rounded-xl bg-brand-cyan px-8 text-sm font-bold text-black transition-all hover:opacity-90 hover:shadow-[0_0_24px_rgba(7,194,239,0.4)] disabled:cursor-not-allowed disabled:opacity-50';

export const MODAL_DESTRUCTIVE_CLS =
  'flex h-12 min-w-[160px] items-center justify-center gap-2 rounded-xl bg-red-500 px-8 text-sm font-bold text-white transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

export function ModalHeader({
  title,
  subtitle,
  titleId,
  onClose,
}: {
  title: string;
  subtitle?: string;
  titleId?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between p-8 pb-4">
      <div>
        <h2 id={titleId} className="text-[20px] font-bold leading-tight text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-[13px] text-white/50">{subtitle}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <X size={20} />
      </button>
    </div>
  );
}

export function ModalBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-2 scrollbar-hide">
      {children}
    </div>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-4 border-t border-white/[0.03] bg-white/[0.01] p-8 py-6">
      {children}
    </div>
  );
}
