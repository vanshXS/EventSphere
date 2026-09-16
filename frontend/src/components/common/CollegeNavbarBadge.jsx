import React from "react";
import { GraduationCap } from "lucide-react";

export default function CollegeNavbarBadge({
  collegeName,
  collegeCode,
  collegeId,
  className = "",
  compact = false
}) {
  if (!collegeName && !collegeCode && !collegeId) {
    return null;
  }

  const displayName =
    collegeName ||
    (collegeCode ? `Campus (${collegeCode})` : "Affiliated Campus");

  const fullTooltip = [
    collegeName,
    collegeCode ? `Code: ${collegeCode}` : null,
    collegeId ? `ID: ${collegeId}` : null
  ]
    .filter(Boolean)
    .join(" • ");

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/90 hover:bg-indigo-50/80 border border-slate-200/80 text-slate-700 transition-colors cursor-default ${className}`}
        title={fullTooltip}
      >
        <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        <span className="text-xs font-semibold text-slate-800 max-w-[120px] truncate">
          {collegeCode || displayName}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50/90 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-200 transition-all duration-200 shadow-2xs select-none cursor-default ${className}`}
      title={fullTooltip}
    >
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 shrink-0 shadow-2xs">
        <GraduationCap className="w-4 h-4" />
      </div>

      <div className="flex flex-col text-left min-w-0">
        <div className="flex items-center gap-1.5 leading-none mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors">
            Campus
          </span>
          {collegeCode && (
            <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold tracking-tight bg-indigo-100 text-indigo-700 border border-indigo-200/60">
              {collegeCode}
            </span>
          )}
        </div>

        <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-900 truncate max-w-[140px] sm:max-w-[200px] md:max-w-[280px] lg:max-w-[340px] leading-tight">
          {displayName}
        </span>
      </div>
    </div>
  );
}
