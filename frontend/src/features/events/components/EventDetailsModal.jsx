import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Calendar, 
  MapPin, 
  Info, 
  Layers, 
  Trophy, 
  Clock, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  Globe 
} from "lucide-react";
import { formatDateTime, formatDateRange, getVisibilityLabel } from "../utils/eventHelpers";
import { 
  getActivityTypeLabel, 
  getActivityTypeBadgeStyle, 
  formatCapacitySummary,
  isRegistrationOpen,
  isEnded 
} from "../../activities/utils/activityHelpers";
import { getActivitiesOfVisibleEvent } from "../../registration/registrationApi";

export default function EventDetailsModal({
  isOpen,
  event,
  myRegistrations = [],
  onClose,
  onRegisterActivity,
  onViewActivityDetails
}) {
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (isOpen && event?.id) {
      loadActivities(event.id);
    } else {
      setActivities([]);
      setError("");
    }
  }, [isOpen, event?.id]);

  const loadActivities = async (eventId) => {
    try {
      setLoadingActivities(true);
      setError("");
      const data = await getActivitiesOfVisibleEvent(eventId);
      setActivities(data);
    } catch (err) {
      console.error("Failed to load activities for event:", err);
      setError("Unable to load activities for this event.");
    } finally {
      setLoadingActivities(false);
    }
  };

  if (!isOpen || !event) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-left max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Layers className="w-3 h-3" />
                Event
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                <Globe className="w-3 h-3 text-slate-400" />
                {getVisibilityLabel(event.visibility)}
              </span>
            </div>
            <h2 id="event-details-title" className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {event.title}
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
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Key Info Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-500 block">Schedule</span>
                <span className="font-semibold text-slate-800">
                  {formatDateRange(event.startDateTime, event.endDateTime)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-500 block">Venue</span>
                <span className="font-semibold text-slate-800">
                  {event.venue || "Venue not set"}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>About this Event</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Sub-Activities & Competitions */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Activities & Competitions ({activities.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Participate in individual competitions under this event
              </span>
            </div>

            {loadingActivities ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Loading activities...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {error}
              </div>
            ) : activities.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/80 text-slate-500 text-xs">
                No activities or competitions listed under this event yet.
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => {
                  const isRegistered = myRegistrations.some(
                    (r) => r.activityId === act.id && r.status === "REGISTERED"
                  );
                  const capInfo = formatCapacitySummary(
                    act.registrationType,
                    act.capacity,
                    act.minTeamSize,
                    act.maxTeamSize
                  );
                  const typeBadge = getActivityTypeBadgeStyle(act.type || act.activityType);

                  return (
                    <div
                      key={act.id}
                      className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeBadge}`}>
                              {getActivityTypeLabel(act.type || act.activityType)}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {act.registrationType}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {act.name}
                          </h4>
                        </div>

                        {isRegistered ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Registered
                          </span>
                        ) : isRegistrationOpen(act) ? (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onRegisterActivity(act);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Register</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                            {isEnded(act) ? "Ended" : "Registration Closed"}
                          </span>
                        )}
                      </div>

                      {act.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {act.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Deadline: {formatDateTime(act.registrationDeadline || act.registrationDeadLine)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {capInfo.typeText} · {capInfo.capacityText}
                          </span>
                        </div>

                        {onViewActivityDetails && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onViewActivityDetails(act);
                            }}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            Full Details & Rules →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
}
