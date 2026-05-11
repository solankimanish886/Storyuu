import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  MODAL_CANCEL_CLS,
  MODAL_DESTRUCTIVE_CLS,
} from '@/components/ui/Modal';

export interface DeleteUserModalProps {
  userName: string;
  userEmail: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function DeleteUserModal({
  userName,
  userEmail,
  onConfirm,
  onCancel,
}: DeleteUserModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onCancel} labelId="delete-user-modal-title" maxWidth="max-w-[420px]">
      <ModalHeader title="Delete User" titleId="delete-user-modal-title" onClose={onCancel} />

      <ModalBody>
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <Trash2 size={28} strokeWidth={2} className="text-red-500" />
          </div>
          <div>
            <p className="text-[14px] leading-relaxed text-white/60">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
          </div>
          <div className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-left">
            <p className="text-sm font-semibold text-white">{userName || '(no name)'}</p>
            <p className="text-xs text-white/50 mt-0.5">{userEmail}</p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <button type="button" onClick={onCancel} disabled={loading} className={`${MODAL_CANCEL_CLS} disabled:opacity-50`}>
          Cancel
        </button>
        <button type="button" onClick={handleConfirm} disabled={loading} className={`${MODAL_DESTRUCTIVE_CLS} disabled:opacity-50`}>
          {loading
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            : 'Delete User'
          }
        </button>
      </ModalFooter>
    </Modal>
  );
}
