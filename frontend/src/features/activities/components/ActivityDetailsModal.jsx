import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  FileText, 
  Info, 
  Sparkles 
} from "lucide-react";
import { 
  getActivityTypeLabel, 
  getActivityTypeBadgeStyle, 
  formatCapacitySummary,
  isRegistrationOpen,
  isEnded 
} from "../utils/activityHelpers";
import { formatDateTime } from "../../events/utils/eventHelpers";

export default function ActivityDetailsModal({
  isOpen,
  activity,
  isRegistered = false,
  onRegisterClick,
  onClose
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !activity) return null;

  const capacityInfo = formatCapacitySummary(
    activity.registrationType,
    activity.capacity,
    activity.minTeamSize,
    activity.maxTeamSize
  );

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-left max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getActivityTypeBadgeStyle(activity.type || activity.activityType)}`}>
                {getActivityTypeLabel(activity.type || activity.activityType)}
              </span>
              <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {activity.registrationType}
              </span>
              {isRegistered && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Registered
                </span>
              )}
            </div>
            <h2 id="activity-details-title" className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {activity.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* Description */}
          {activity.description && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Description</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {activity.description}
              </p>
            </div>
          )}

          {/* Key Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs sm:text-sm">
            {/* Schedule */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Schedule</span>
              </div>
              <div className="font-medium text-slate-800">
                {formatDateTime(activity.startDateTime)} – {formatDateTime(activity.endDateTime)}
              </div>
            </div>

            {/* Registration Deadline */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Registration Deadline</span>
              </div>
              <div className="font-medium text-slate-800">
                {formatDateTime(activity.registrationDeadline || activity.registrationDeadLine)}
              </div>
            </div>

            {/* Venue / Location */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Location</span>
              </div>
              <div className="font-medium text-slate-800">
                {activity.location || "Within event venue / Campus"}
              </div>
            </div>

            {/* Registration & Capacity */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Participation & Capacity</span>
              </div>
              <div className="font-medium text-slate-800">
                {capacityInfo.typeText} · {capacityInfo.capacityText}
              </div>
              {capacityInfo.teamText && (
                <div className="text-xs text-slate-500 font-medium">
                  Team requirement: {capacityInfo.teamText}
                </div>
              )}
            </div>
          </div>

          {/* Rules & Guidelines */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Rules & Guidelines</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {activity.rules || "Standard competition rules and fair play guidelines apply."}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          {onRegisterClick && (
            isRegistered ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                You are registered for this activity
              </span>
            ) : isRegistrationOpen(activity) ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRegisterClick(activity);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Register Now
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg">
                {isEnded(activity) ? "Activity Ended" : "Registration Closed"}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
}
