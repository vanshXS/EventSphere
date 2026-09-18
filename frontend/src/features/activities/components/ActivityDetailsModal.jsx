import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Info,
  Play,
  CheckCircle2
} from "lucide-react";

import {
  getActivityTypeLabel,
  getActivityTypeBadgeStyle,
  formatCapacitySummary,
  isRegistrationOpen,
  isEnded
} from "../utils/activityHelpers";

import { formatDateTime } from "../../events/utils/eventHelpers";

import RegistrationStatusBadge from "../../registration/components/RegistrationStatusBadge";
import {
  blocksRegistration,
  normalizeRegistrationStatus
} from "../../registration/utils/registrationHelpers";

export default function ActivityDetailsModal({
  isOpen,
  activity,
  isRegistered = false,
  registration = null,
  onRegisterClick,
  onClose
}) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !activity) return null;

  const hasRegistration =
    blocksRegistration(registration) || isRegistered;

  const registrationStatus = normalizeRegistrationStatus(
    registration?.status || (isRegistered ? "REGISTERED" : null)
  );

  const capacityInfo = formatCapacitySummary(
    activity.registrationType,
    activity.capacity,
    activity.minTeamSize,
    activity.maxTeamSize
  );

  const registrationMessage =
    registrationStatus === "PENDING"
      ? "Waiting for organizer approval."
      : registrationStatus === "REJECTED"
      ? "Request rejected. See My Registrations for details."
      : "Your registration is approved.";

  const type = activity.type || activity.activityType;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:p-6">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getActivityTypeBadgeStyle(
                  type
                )}`}
              >
                {getActivityTypeLabel(type)}
              </span>

              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                {activity.registrationType}
              </span>

              {activity.status && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    activity.status === "ONGOING"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : activity.status === "COMPLETED"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : activity.status === "PUBLISHED"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-slate-100 text-slate-600"
                  }`}
                >
                  {activity.status === "ONGOING" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                  {activity.status === "COMPLETED" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                  {activity.status.charAt(0) + activity.status.slice(1).toLowerCase()}
                </span>
              )}

              {hasRegistration && (
                <RegistrationStatusBadge
                  status={registrationStatus}
                />
              )}
            </div>

            <h2
              id="activity-details-title"
              className="text-xl font-bold leading-snug text-slate-900 sm:text-2xl"
            >
              {activity.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close activity details"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto p-5 sm:p-6">
          {activity.description && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Info className="h-3.5 w-3.5" />
                Description
              </h3>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {activity.description}
              </p>
            </section>
          )}

          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <h3 className="flex items-center gap-1 text-xs font-medium uppercase text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                Schedule
              </h3>

              <p className="font-medium text-slate-800">
                {formatDateTime(activity.startDateTime)}
                {" – "}
                {formatDateTime(activity.endDateTime)}
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="flex items-center gap-1 text-xs font-medium uppercase text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                Registration deadline
              </h3>

              <p className="font-medium text-slate-800">
                {formatDateTime(
                  activity.registrationDeadline ||
                    activity.registrationDeadLine
                )}
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="flex items-center gap-1 text-xs font-medium uppercase text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                Location
              </h3>

              <p className="font-medium text-slate-800">
                {activity.location || "Within event venue / Campus"}
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="flex items-center gap-1 text-xs font-medium uppercase text-slate-500">
                <Users className="h-3.5 w-3.5" />
                Participation & capacity
              </h3>

              <p className="font-medium text-slate-800">
                {capacityInfo.typeText} · {capacityInfo.capacityText}
              </p>

              {capacityInfo.teamText && (
                <p className="text-xs text-slate-500">
                  Team requirement: {capacityInfo.teamText}
                </p>
              )}
            </div>

            {(activity.actualStartDateTime || activity.actualEndDateTime) && (
              <div className="space-y-1 sm:col-span-2 border-t border-slate-200/60 pt-3">
                <h3 className="flex items-center gap-1 text-xs font-semibold uppercase text-indigo-700">
                  <Play className="h-3.5 w-3.5 text-indigo-600" />
                  Actual Execution / Operational Times
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
                  {activity.actualStartDateTime && (
                    <span className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-md">
                      <span className="font-semibold text-amber-700">Started:</span> {formatDateTime(activity.actualStartDateTime)}
                    </span>
                  )}
                  {activity.actualEndDateTime && (
                    <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-md">
                      <span className="font-semibold text-emerald-700">Completed:</span> {formatDateTime(activity.actualEndDateTime)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {activity.requiresApproval === true && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              New registrations require organizer approval.
            </p>
          )}

          {registration?.reviewNote && (
            <section className="space-y-2 rounded-lg border border-slate-200 p-3">
              <h3 className="text-xs font-semibold text-slate-700">
                Organizer note
              </h3>

              <p className="whitespace-pre-wrap break-words text-sm text-slate-600">
                {registration.reviewNote}
              </p>

              {registration.reviewedAt && (
                <p className="text-xs text-slate-400">
                  Reviewed {formatDateTime(registration.reviewedAt)}
                </p>
              )}
            </section>
          )}

          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              Rules & guidelines
            </h3>

            <div className="whitespace-pre-wrap rounded-xl border border-slate-200/60 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {activity.rules ||
                "Standard competition rules and fair play guidelines apply."}
            </div>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>

          {onRegisterClick &&
            (hasRegistration ? (
              <p className="max-w-sm text-xs font-medium text-slate-600">
                {registrationMessage}
              </p>
            ) : isRegistrationOpen(activity) ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRegisterClick(activity);
                }}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-medium text-white shadow-xs hover:bg-indigo-700"
              >
                Register Now
              </button>
            ) : (
              <span className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
                {isEnded(activity)
                  ? "Activity Ended"
                  : "Registration Closed"}
              </span>
            ))}
        </footer>
      </div>
    </div>,
    document.body
  );
}