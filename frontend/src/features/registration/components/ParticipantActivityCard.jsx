import { Clock, Calendar, Users, ChevronRight } from "lucide-react";

import { formatDateTime } from "../../events/utils/eventHelpers";

import {
  getActivityTypeLabel,
  getActivityTypeBadgeStyle,
  formatCapacitySummary,
  isRegistrationOpen,
  isEnded
} from "../../activities/utils/activityHelpers";

import { blocksRegistration } from "../utils/registrationHelpers";
import RegistrationStatusBadge from "./RegistrationStatusBadge";

export default function ParticipantActivityCard({
  activity,
  event = null,
  registration = null,
  isRegistered = false,
  onRegisterClick,
  onViewMyRegistrations,
  onViewDetails
}) {
  const hasRegistration =
    blocksRegistration(registration) || isRegistered;

  const type = activity.activityType || activity.type;

  const capacityInfo = formatCapacitySummary(
    activity.registrationType,
    activity.capacity,
    activity.minTeamSize,
    activity.maxTeamSize
  );

  const registrationOpen = isRegistrationOpen(activity, event);
  const eventEnded = Boolean(event && (event.eventStatus === "COMPLETED" || event.status === "COMPLETED" || isEnded(event)));
  const activityEnded = isEnded(activity);
  const activityOngoing = activity.status === "ONGOING" || Boolean(activity.actualStartDateTime);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-colors hover:border-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getActivityTypeBadgeStyle(
                type
              )}`}
            >
              {getActivityTypeLabel(type)}
            </span>

            <span className="text-[11px] font-medium text-slate-500">
              {activity.registrationType}
            </span>

            {activity.status === "ONGOING" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Ongoing
              </span>
            )}
            {activity.status === "COMPLETED" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Completed
              </span>
            )}
          </div>

          <h4 className="text-base font-bold text-slate-900">
            {activity.name}
          </h4>
        </div>

        {hasRegistration ? (
          <RegistrationStatusBadge
            status={registration?.status || "REGISTERED"}
          />
        ) : (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            registrationOpen
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-600"
          }`}>
            {registrationOpen
              ? "Registration open"
              : eventEnded
              ? "Event ended"
              : activityEnded
              ? "Ended"
              : activityOngoing
              ? "In progress"
              : "Registration closed"}
          </span>
        )}
      </div>

      {activity.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
          {activity.description}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>
            {formatDateTime(activity.startDateTime)}
            {" – "}
            {formatDateTime(activity.endDateTime)}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>
            Deadline:{" "}
            {formatDateTime(
              activity.registrationDeadline ||
                activity.registrationDeadLine
            )}
          </span>
        </div>

        <div className="flex items-start gap-2 sm:col-span-2">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>
            {capacityInfo.typeText} · {capacityInfo.capacityText}
            {capacityInfo.teamText && ` · ${capacityInfo.teamText}`}
          </span>
        </div>

        {(activity.actualStartDateTime || activity.actualEndDateTime) && (
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-[11px]">
            {activity.actualStartDateTime && (
              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Started: {formatDateTime(activity.actualStartDateTime)}
              </span>
            )}
            {activity.actualEndDateTime && (
              <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Completed: {formatDateTime(activity.actualEndDateTime)}
              </span>
            )}
          </div>
        )}
      </div>

      {activity.requiresApproval === true && !hasRegistration && (
        <p className="text-xs text-amber-800">
          Organizer approval is required.
        </p>
      )}

      {registration?.status === "REJECTED" && registration.reviewNote && (
        <p className="whitespace-pre-wrap break-words rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs text-rose-800">
          Organizer note: {registration.reviewNote}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-3">
        {onViewDetails && (
          <button
            type="button"
            onClick={onViewDetails}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Details & rules
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}

        {hasRegistration ? (
          onViewMyRegistrations && (
            <button
              type="button"
              onClick={onViewMyRegistrations}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View My Registrations
            </button>
          )
        ) : (
          onRegisterClick && (
            <button
              type="button"
              onClick={onRegisterClick}
              disabled={!registrationOpen}
              title={
                !registrationOpen
                  ? eventEnded
                    ? "Parent event has ended"
                    : activityEnded
                    ? "Activity has ended"
                    : activityOngoing
                    ? "Activity is already in progress"
                    : "Registration is closed"
                  : "Register for activity"
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Register
            </button>
          )
        )}
      </div>
    </div>
  );
}