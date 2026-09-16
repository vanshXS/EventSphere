import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Calendar,
  MapPin,
  Loader2,
  RefreshCw
} from "lucide-react";

import {
  formatDateRange,
  getVisibilityLabel
} from "../utils/eventHelpers";

import { getActivitiesOfVisibleEvent } from "../../registration/registrationApi";
import { getActivityRegistration } from "../../registration/utils/registrationHelpers";
import ParticipantActivityCard from "../../registration/components/ParticipantActivityCard";

export default function EventDetailsModal({
  isOpen,
  event,
  myRegistrations = [],
  onClose,
  onRegisterActivity,
  onViewActivityDetails,
  onViewMyRegistrations
}) {
  if (!isOpen || !event) return null;

  return createPortal(
    <EventDetailsContent
      key={event.id}
      event={event}
      myRegistrations={myRegistrations}
      onClose={onClose}
      onRegisterActivity={onRegisterActivity}
      onViewActivityDetails={onViewActivityDetails}
      onViewMyRegistrations={onViewMyRegistrations}
    />,
    document.body
  );
}

function EventDetailsContent({
  event,
  myRegistrations,
  onClose,
  onRegisterActivity,
  onViewActivityDetails,
  onViewMyRegistrations
}) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    getActivitiesOfVisibleEvent(event.id)
      .then((data) => {
        if (!ignore) {
          setActivities(data);
          setError("");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err.response?.data?.message ||
              "Could not load activities for this event."
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [event.id, reloadKey]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const refreshActivities = () => {
    setLoading(true);
    setError("");
    setReloadKey((previous) => previous + 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
      onClick={(clickEvent) => {
        if (clickEvent.target === clickEvent.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:p-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                Event
              </span>

              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
                {getVisibilityLabel(event.visibility)}
              </span>
            </div>

            <h2
              id="event-details-title"
              className="text-xl font-bold text-slate-900 sm:text-2xl"
            >
              {event.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close event details"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
              <div>
                <p className="text-xs text-slate-500">Schedule</p>
                <p className="mt-1 font-medium text-slate-800">
                  {formatDateRange(
                    event.startDateTime,
                    event.endDateTime
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Venue</p>
                <p className="mt-1 font-medium text-slate-800">
                  {event.venue || "Venue not set"}
                </p>
              </div>
            </div>
          </div>

          {event.description && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                About this event
              </h3>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {event.description}
              </p>
            </section>
          )}

          <section className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">
                Activities & Competitions ({activities.length})
              </h3>

              <button
                type="button"
                onClick={refreshActivities}
                disabled={loading}
                aria-label="Refresh event activities"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                Loading activities...
              </div>
            ) : error ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={refreshActivities}
                  className="mt-2 font-semibold underline"
                >
                  Try again
                </button>
              </div>
            ) : activities.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                No activities are listed under this event yet.
              </p>
            ) : (
              activities.map((activity) => (
                <ParticipantActivityCard
                  key={activity.id}
                  activity={activity}
                  registration={getActivityRegistration(
                    myRegistrations,
                    activity.id
                  )}
                  onRegisterClick={
                    onRegisterActivity
                      ? () => {
                          onClose();
                          onRegisterActivity(activity);
                        }
                      : undefined
                  }
                  onViewDetails={
                    onViewActivityDetails
                      ? () => {
                          onClose();
                          onViewActivityDetails(activity);
                        }
                      : undefined
                  }
                  onViewMyRegistrations={
                    onViewMyRegistrations
                      ? () => {
                          onClose();
                          onViewMyRegistrations();
                        }
                      : undefined
                  }
                />
              ))
            )}
          </section>
        </div>

        <footer className="flex justify-end border-t border-slate-100 bg-slate-50/50 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}