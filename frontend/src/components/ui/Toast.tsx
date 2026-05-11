import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    // Deduplicate: remove any existing toast with same message+type so the new
    // one starts a fresh timer. The old timer fires against the old id (no-op).
    setToasts((prev) => [
      ...prev.filter((t) => !(t.message === message && t.type === type)),
      { id, message, type },
    ]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle2 className="text-emerald-400" size={20} />,
    error: <AlertCircle className="text-rose-400" size={20} />,
    info: <Info className="text-sky-400" size={20} />,
  };

  const bgColors = {
    success: 'bg-emerald-500/10 border-emerald-500/20',
    error: 'bg-rose-500/10 border-rose-500/20',
    info: 'bg-sky-500/10 border-sky-500/20',
  };

  return (
    <div className={`flex min-w-[320px] animate-fade-in-up items-center gap-4 rounded-2xl border p-4 backdrop-blur-xl ${bgColors[toast.type]} shadow-[0_8px_32px_rgba(0,0,0,0.4)]`}>
      <div className="shrink-0">{icons[toast.type]}</div>
      <p className="flex-1 text-[14px] font-medium text-white">{toast.message}</p>
      <button
        onClick={onClose}
        className="rounded-full p-1 text-white/20 hover:bg-white/5 hover:text-white transition-all"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
