import { useEffect } from "react";
import { LoaderCircle, Info } from "lucide-react";
import { displayStatus } from "../utils/judgingFormatter";
import { useToast } from "../../../components/common/ToastContext";

const badgeStyles = {
  DRAFT: "border-slate-200 bg-slate-100 text-slate-700",
  OPEN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLOSED: "border-amber-200 bg-amber-50 text-amber-800",
  PUBLISHED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REVOKED: "border-slate-200 bg-slate-100 text-slate-500",
  SUBMITTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DRAFT_EVALUATION: "border-amber-200 bg-amber-50 text-amber-800",
  NOT_STARTED: "border-slate-200 bg-slate-100 text-slate-600",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REGISTERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
};

export function StatusBadge({ status, className = "" }) {
  const key = status === "DRAFT" ? "DRAFT" : status || "DRAFT";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeStyles[key] || badgeStyles.DRAFT} ${className}`}>
      {displayStatus(status)}
    </span>
  );
}

export function ErrorNotice({ message }) {
  const addToast = useToast();
  useEffect(() => {
    if (message) addToast(message, "error");
  }, [message, addToast]);
  return null;
}

export function SuccessNotice({ message }) {
  const addToast = useToast();
  useEffect(() => {
    if (message) addToast(message, "success");
  }, [message, addToast]);
  return null;
}

export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description, action = null }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <div className="mb-3 rounded-xl bg-slate-100 p-3 text-slate-500"><Info className="h-5 w-5" /></div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const primaryButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const dangerButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50";
export const inputClass = "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-500";
export const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";
