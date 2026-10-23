// Editor toasts: one at a time, in a polite live region. Toasts with an action (Undo) stay for 8 seconds.
import { useEffect, useState } from "react";
import type { ToastInput } from "./context.tsx";

export function useToasts() {
  const [toast, setToast] = useState<(ToastInput & { key: number }) | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.action ? 8000 : 4000);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, show: (t: ToastInput) => setToast({ ...t, key: Date.now() }), clear: () => setToast(null) };
}

export function Toasts({ toast, clear }: { toast: (ToastInput & { key: number }) | null; clear: () => void }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.key}>
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                toast.action!.run();
                clear();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
