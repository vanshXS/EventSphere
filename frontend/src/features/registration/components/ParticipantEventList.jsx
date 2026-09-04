import React from "react";
import { Calendar, MapPin } from "lucide-react";
import { formatDateTime } from "../../events/utils/eventHelpers";

export default function ParticipantEventList({
  events,
  selectedEventId,
  onSelectEvent
}) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
        <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
        <h4 className="text-sm font-semibold text-slate-800">No Events Found</h4>
        <p className="text-xs text-slate-500">No published events matching your college.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Available Events ({events.length})
      </h2>
      <div className="space-y-2.5">
        {events.map((evt) => {
          const isSelected = evt.id === selectedEventId;
          return (
            <div
              key={evt.id}
              onClick={() => onSelectEvent(evt.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? "bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {evt.title}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                  {evt.visibility === "COLLEGE_ONLY" ? "College Only" : "Open to All"}
                </span>
              </div>

              {evt.description && (
                <p className="text-xs text-slate-600 line-clamp-2 mt-1.5 leading-relaxed">
                  {evt.description}
                </p>
              )}

              <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{formatDateTime(evt.startDateTime)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{evt.venue || "Campus"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
