import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { ToastContext } from "./ToastContext";

const toastStyles = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    iconClassName: "text-emerald-600"
  },
  error: {
    icon: XCircle,
    className: "border-rose-200 bg-rose-50 text-rose-900",
    iconClassName: "text-rose-600"
  },
  info: {
    icon: Info,
    className: "border-slate-200 bg-white text-slate-800",
    iconClassName: "text-slate-500"
  }
};

function ToastItem({ toast, onDismiss }) {
  const { icon: Icon, className, iconClassName } = toastStyles[toast.type];

  useEffect(() => {
    const timeout = window.setTimeout(
      () => onDismiss(toast.id),
      toast.type === "error" ? 6000 : 4500
    );
    return () => window.clearTimeout(timeout);
  }, [toast.id, toast.type, onDismiss]);

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg ${className}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClassName}`} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          onClick={() => {
            toast.onAction();
            onDismiss(toast.id);
          }}
          className="shrink-0 text-xs font-bold underline underline-offset-2"
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", options = {}) => {
    if (!message) return;
    const normalizedType = Object.hasOwn(toastStyles, type) ? type : "info";
    const id = nextId.current++;
    setToasts((current) => [
      ...current.slice(-3),
      { id, message: String(message), type: normalizedType, ...options }
    ]);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {createPortal(
        <div
          role="region"
          aria-label="Notifications"
          className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-end gap-3 px-4 sm:left-auto sm:w-full sm:max-w-md sm:px-4"
        >
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto w-full animate-fade-in">
              <ToastItem toast={toast} onDismiss={dismissToast} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
