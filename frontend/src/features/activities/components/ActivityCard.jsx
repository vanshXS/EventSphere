import { useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ChevronRight,
  UserCheck,
  Play,
  CheckCircle2,
  Trash2,
  Loader2
} from "lucide-react";

import {
  getActivityTypeLabel,
  getActivityTypeBadgeStyle,
  formatCapacitySummary
} from "../utils/activityHelpers";

import { formatDateTime } from "../../events/utils/eventHelpers";
import ActivityDetailsModal from "./ActivityDetailsModal";
import ActivityRegistrationsModal from "../../registration/components/ActivityRegistrationsModal";
import ConfirmDialog from "../../events/components/ConfirmDialog";

export default function ActivityCard({ 
  activity, 
  onEdit, 
  onDelete, 
  onStart, 
  onComplete,
  isStarting = false,
  isCompleting = false,
  isDeleting = false
}) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const isDraft = !activity.status || activity.status === "DRAFT";
  const isPublished = activity.status === "PUBLISHED";
  const isOngoing = activity.status === "ONGOING";
  const isCompleted = activity.status === "COMPLETED";

  const getStatusBadge = () => {
    if (isDraft) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border bg-slate-100 text-slate-700 border-slate-200">
          Draft
        </span>
      );
    }
    if (isPublished) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border bg-indigo-50 text-indigo-700 border-indigo-200">
          Published
        </span>
      );
    }
    if (isOngoing) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border bg-amber-50 text-amber-700 border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Ongoing
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
          Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border bg-slate-100 text-slate-700 border-slate-200">
        {activity.status}
      </span>
    );
  };

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
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getActivityTypeBadgeStyle(
                  activity.type
                )}`}
              >
                {getActivityTypeLabel(activity.type)}
              </span>
              {getStatusBadge()}
            </div>

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

            {activity.actualStartDateTime && (
              <div className="flex items-start gap-2 text-emerald-700 font-medium">
                <Play className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 fill-current" />
                <span>
                  Started: {formatDateTime(activity.actualStartDateTime)}
                </span>
              </div>
            )}

            {activity.actualEndDateTime && (
              <div className="flex items-start gap-2 text-slate-700 font-medium">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
                <span>
                  Completed: {formatDateTime(activity.actualEndDateTime)}
                </span>
              </div>
            )}
          </div>

          {capacityInfo.teamText && (
            <p className="text-xs text-slate-500">
              {capacityInfo.teamText}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowRegistrationsModal(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
          >
            <UserCheck className="h-3.5 w-3.5" />
            Registrations
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {onStart && isPublished && (
              <button
                type="button"
                onClick={() => setShowStartConfirm(true)}
                disabled={isStarting}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors disabled:opacity-60 cursor-pointer shadow-2xs"
                title="Start activity now"
              >
                {isStarting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
                <span>{isStarting ? "Starting…" : "Start"}</span>
              </button>
            )}

            {onComplete && isOngoing && (
              <button
                type="button"
                onClick={() => setShowCompleteConfirm(true)}
                disabled={isCompleting}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-60 cursor-pointer shadow-2xs"
                title="Mark activity as completed"
              >
                {isCompleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                <span>{isCompleting ? "Completing…" : "Complete"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowDetailsModal(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
            >
              Details
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
              >
                Edit
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:underline cursor-pointer disabled:opacity-50"
                title="Delete this activity"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
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

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete this activity?"
        message={`Are you sure you want to delete "${activity.name}"? This action cannot be undone.`}
        confirmLabel="Delete Activity"
        cancelLabel="Cancel"
        isDestructive
        isLoading={isDeleting}
        onConfirm={async () => {
          if (onDelete) {
            await onDelete(activity.id);
          }
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showStartConfirm}
        title="Start this activity now?"
        message={`Starting "${activity.name}" sets its status to Ongoing and records the current server time as actual start time.`}
        confirmLabel="Start Activity"
        cancelLabel="Cancel"
        isLoading={isStarting}
        onConfirm={async () => {
          if (onStart) {
            await onStart(activity.id);
          }
          setShowStartConfirm(false);
        }}
        onCancel={() => setShowStartConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showCompleteConfirm}
        title="Mark activity as completed?"
        message={`Completing "${activity.name}" sets its status to Completed and records the current server time as actual end time.`}
        confirmLabel="Complete Activity"
        cancelLabel="Cancel"
        isLoading={isCompleting}
        onConfirm={async () => {
          if (onComplete) {
            await onComplete(activity.id);
          }
          setShowCompleteConfirm(false);
        }}
        onCancel={() => setShowCompleteConfirm(false)}
      />
    </>
  );
}