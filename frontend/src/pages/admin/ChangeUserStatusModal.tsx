import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  MODAL_CANCEL_CLS,
  MODAL_PRIMARY_CLS,
  MODAL_DESTRUCTIVE_CLS,
  MODAL_LABEL_CLS,
} from '@/components/ui/Modal';

export interface ChangeUserStatusModalProps {
  userName: string;
  userEmail: string;
  currentStatus: 'active' | 'blocked';
  onConfirm: (newStatus: 'active' | 'blocked') => Promise<void>;
  onCancel: () => void;
}

export default function ChangeUserStatusModal({
  userName,
  userEmail,
  currentStatus,
  onConfirm,
  onCancel,
}: ChangeUserStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'blocked'>(currentStatus);
  const [loading, setLoading] = useState(false);

  const isBlocking = selectedStatus === 'blocked';
  const changed = selectedStatus !== currentStatus;

  async function handleConfirm() {
    if (!changed) { onCancel(); return; }
    setLoading(true);
    try {
      await onConfirm(selectedStatus);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onCancel} labelId="change-status-modal-title" maxWidth="max-w-[440px]">
      <ModalHeader title="Change User Status" titleId="change-status-modal-title" onClose={onCancel} />

      <ModalBody>
        <div className="flex flex-col gap-5 pb-2">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
            <p className="text-sm font-semibold text-white">{userName || '(no name)'}</p>
            <p className="text-xs text-white/50 mt-0.5">{userEmail}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-xs text-white/40">Current status:</span>
              {currentStatus === 'active'
                ? <span className="rounded-full bg-status-success/10 px-2 py-0.5 text-xs font-semibold text-status-success">Active</span>
                : <span className="rounded-full bg-status-error/10 px-2 py-0.5 text-xs font-semibold text-status-error">Blocked</span>
              }
            </div>
          </div>

          <div>
            <label className={MODAL_LABEL_CLS} htmlFor="status-select">New status</label>
            <select
              id="status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'active' | 'blocked')}
              className="w-full rounded-xl border border-white/[0.05] bg-admin-bg px-4 h-12 text-sm text-white focus:border-brand-cyan/50 focus:outline-none transition-all"
            >
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          {changed && isBlocking && (
            <div className="flex items-start gap-3 rounded-xl bg-status-error/10 border border-status-error/20 px-4 py-3">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-status-error" />
              <p className="text-xs leading-relaxed text-status-error">
                This user will be logged out immediately and unable to log in until their status is changed back to Active.
              </p>
            </div>
          )}

          {changed && !isBlocking && (
            <div className="flex items-start gap-3 rounded-xl bg-status-success/10 border border-status-success/20 px-4 py-3">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-status-success" />
              <p className="text-xs leading-relaxed text-status-success">
                This user will be able to log in again immediately.
              </p>
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <button type="button" onClick={onCancel} disabled={loading} className={`${MODAL_CANCEL_CLS} disabled:opacity-50`}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading || !changed}
          className={
            isBlocking
              ? `${MODAL_DESTRUCTIVE_CLS} disabled:opacity-50`
              : `flex items-center justify-center gap-2 ${MODAL_PRIMARY_CLS}`
          }
        >
          {loading
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            : 'Update Status'
          }
        </button>
      </ModalFooter>
    </Modal>
  );
}
