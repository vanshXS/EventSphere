import { normalizeRegistrationStatus } from "../utils/registrationHelpers";
const statuses = {
  PENDING: {
    label: "Pending approval",
    styles: "bg-amber-50 text-amber-800 border-amber-200"
  },
  APPROVED: {
    label: "Approved",
    styles: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  REJECTED: {
    label: "Rejected",
    styles: "bg-rose-50 text-rose-700 border-rose-200"
  },
  CANCELLED: {
    label: "Cancelled",
    styles: "bg-slate-100 text-slate-600 border-slate-200"
  }
};

export default function RegistrationStatusBadge({ status }) {
  const normalizedStatus = normalizeRegistrationStatus(status);

  const config = statuses[normalizedStatus] || {
    label: status || "Unknown",
    styles: "bg-slate-100 text-slate-600 border-slate-200"
  };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${config.styles}`}
    >
      {config.label}
    </span>
  );
}