import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  MODAL_CANCEL_CLS,
  MODAL_DESTRUCTIVE_CLS,
  MODAL_PRIMARY_CLS,
} from './Modal';

export interface ConfirmModalProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  variant?: 'destructive' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'destructive',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  const isDestructive = variant === 'destructive';

  return (
    <Modal onClose={onCancel} labelId="confirm-modal-title" maxWidth="max-w-[420px]">
      <ModalHeader title={title} titleId="confirm-modal-title" onClose={onCancel} />

      <ModalBody>
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              isDestructive ? 'bg-red-500/10' : 'bg-brand-cyan/10'
            }`}
          >
            <AlertTriangle
              size={28}
              strokeWidth={2}
              className={isDestructive ? 'text-red-500' : 'text-brand-cyan'}
            />
          </div>
          <p className="max-w-[300px] text-[14px] leading-relaxed text-white/60">
            {message}
          </p>
        </div>
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={`${MODAL_CANCEL_CLS} disabled:opacity-50`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={
            isDestructive
              ? MODAL_DESTRUCTIVE_CLS
              : `flex items-center justify-center gap-2 ${MODAL_PRIMARY_CLS}`
          }
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            confirmLabel
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}
