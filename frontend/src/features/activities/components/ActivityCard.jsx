import { useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ChevronRight,
  UserCheck
} from "lucide-react";

import {
  getActivityTypeLabel,
  getActivityTypeBadgeStyle,
  formatCapacitySummary
} from "../utils/activityHelpers";

import { formatDateTime } from "../../events/utils/eventHelpers";
import ActivityDetailsModal from "./ActivityDetailsModal";
import ActivityRegistrationsModal from "../../registration/components/ActivityRegistrationsModal";

export default function ActivityCard({ activity, onEdit }) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRegistrationsModal, setShowRegistrationsModal] =
    useState(false);

  const capacityInfo = formatCapacitySummary(
    activity.registrationType,
    activity.capacity,
    activity.minTeamSize,
    activity.maxTeamSize
  );

  return (
    <>
      <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition-colors hover:border-slate-300 sm:p-5">
        <div className="space-y-3">
          <div className="space-y-1">
            <span
              className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getActivityTypeBadgeStyle(
                activity.type
              )}`}
            >
              {getActivityTypeLabel(activity.type)}
            </span>

            <h3 className="text-base font-semibold leading-snug text-slate-900">
              {activity.name}
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            {activity.requiresApproval
              ? "Organizer approval required"
              : "Automatic approval"}
          </p>

          {activity.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
              {activity.description}
            </p>
          )}

          <div className="grid grid-cols-1 gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5 text-xs text-slate-600 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>
                {formatDateTime(activity.startDateTime)}
                {" – "}
                {formatDateTime(activity.endDateTime)}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>
                {activity.location || "Venue specified in event"}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="font-medium text-slate-700">
                {capacityInfo.typeText} · {capacityInfo.capacityText}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>
                Deadline:{" "}
                {formatDateTime(activity.registrationDeadline)}
              </span>
            </div>
          </div>

          {capacityInfo.teamText && (
            <p className="text-xs text-slate-500">
              {capacityInfo.teamText}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowRegistrationsModal(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            <UserCheck className="h-3.5 w-3.5" />
            Registrations
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDetailsModal(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Details
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <ActivityDetailsModal
        isOpen={showDetailsModal}
        activity={activity}
        onClose={() => setShowDetailsModal(false)}
      />

      <ActivityRegistrationsModal
        isOpen={showRegistrationsModal}
        activity={activity}
        onClose={() => setShowRegistrationsModal(false)}
      />
    </>
  );
}