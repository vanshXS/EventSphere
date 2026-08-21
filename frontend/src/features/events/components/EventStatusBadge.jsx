import React from "react";
import { EVENT_STATUS_LABELS } from "../utils/eventHelpers";

const STATUS_CONFIGS = {
  DRAFT: {
    label: "Draft",
    styles: "bg-slate-100 text-slate-700 border-slate-200"
  },
  PUBLISHED: {
    label: "Published",
    styles: "bg-blue-50 text-blue-700 border-blue-200"
  },
  ONGOING: {
    label: "Ongoing",
    styles: "bg-amber-50 text-amber-700 border-amber-200"
  },
  COMPLETED: {
    label: "Completed",
    styles: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  CANCELLED: {
    label: "Cancelled",
    styles: "bg-rose-50 text-rose-700 border-rose-200"
  }
};

export default function EventStatusBadge({ status }) {
  const config = STATUS_CONFIGS[status] || {
    label: EVENT_STATUS_LABELS[status] || status || "Unknown",
    styles: "bg-slate-100 text-slate-600 border-slate-200"
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.styles}`}
    >
      {config.label}
    </span>
  );
}
