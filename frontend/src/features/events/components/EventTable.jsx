import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Send,
  SlidersHorizontal,
  Trash2,
  Layers,
  Trophy,
  Eye,
  MoreVertical,
  Loader2,
  ClipboardCheck,
  Play,
  CheckCircle2
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import EventStatusBadge from "./EventStatusBadge";
import { formatDateRange } from "../utils/eventHelpers";
import { getActivityTypeLabel, getActivityTypeBadgeStyle } from "../../activities/utils/activityHelpers";
import ActivityDetailsModal from "../../activities/components/ActivityDetailsModal";

/* ─── Floating action menu (three-dot) ─── */
function ActionMenu({ children, label = "Actions" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

function MenuButton({ icon: Icon, label, onClick, danger, disabled, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>{label}</span>
    </button>
  );
}

/* ─── Main Component ─── */
export default function EventTable({
  events,
  standaloneActivities = [],
  onPublish,
  onPublishActivity,
  onDelete,
  onDeleteActivity,
  publishingIds = new Set(),
  publishingActivityIds = new Set(),
  deletingIds = new Set(),
  deletingActivityIds = new Set(),
  startingActivityIds = new Set(),
  completingActivityIds = new Set(),
  onStartActivity,
  onCompleteActivity
}) {
  const [eventToDelete, setEventToDelete] = useState(null);
  const [eventToPublish, setEventToPublish] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityToPublish, setActivityToPublish] = useState(null);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [activityToStart, setActivityToStart] = useState(null);
  const [activityToComplete, setActivityToComplete] = useState(null);

  const handleConfirmPublish = async () => {
    if (!eventToPublish) return;
    try {
      await onPublish(eventToPublish.id);
      setEventToPublish(null);
    } catch {
      // The page-level error state explains the failure.
    }
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await onDelete(eventToDelete.id);
      setEventToDelete(null);
    } catch {
      // The page-level error state explains the failure.
    }
  };

  const handleConfirmActivityPublish = async () => {
    if (!activityToPublish) return;
    try {
      await onPublishActivity(activityToPublish.id);
      setActivityToPublish(null);
    } catch {
      // The page-level error state explains the failure.
    }
  };

  const handleConfirmActivityDelete = async () => {
    if (!activityToDelete) return;
    try {
      await onDeleteActivity(activityToDelete.id);
      setActivityToDelete(null);
    } catch {
      // The page-level error state explains the failure.
    }
  };

  const handleConfirmActivityStart = async () => {
    if (!activityToStart || !onStartActivity) return;
    try {
      await onStartActivity(activityToStart.id);
      setActivityToStart(null);
    } catch {
      // The page-level error state explains the failure.
    }
  };

  const handleConfirmActivityComplete = async () => {
    if (!activityToComplete || !onCompleteActivity) return;
    try {
      await onCompleteActivity(activityToComplete.id);
      setActivityToComplete(null);
    } catch {
      // The page-level error state explains the failure.
    }
  };

  const totalCount = events.length + standaloneActivities.length;

  return (
    <>
      <div className="space-y-3">
        {/* ── Event Cards ── */}
        {events.map((event) => {
          const isDraft = event.status === "DRAFT" || event.eventStatus === "DRAFT";
          const isPublishing = publishingIds.has(event.id);
          const isDeleting = deletingIds.has(event.id);
          const isBusy = isPublishing || isDeleting;

          return (
            <div
              key={`event-${event.id}`}
              className={`group bg-white border rounded-xl transition-all duration-200 hover:shadow-md ${
                isBusy
                  ? "border-slate-200 opacity-70"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="px-5 py-4 flex items-start gap-4">
                {/* Left: Icon Indicator */}
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                  <Layers className="w-5 h-5" />
                </div>

                {/* Center: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link
                      to={`/organizer/events/${event.id}/edit`}
                      className="text-sm font-semibold text-slate-900 hover:text-indigo-700 transition-colors truncate max-w-[280px] sm:max-w-none"
                      title={event.title}
                    >
                      {event.title}
                    </Link>
                    <EventStatusBadge status={event.status} />
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wider">
                      Event
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-xs text-slate-500 line-clamp-1 mb-2 max-w-xl">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                      {formatDateRange(event.startDateTime, event.endDateTime)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      {event.venue || "No venue set"}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  <Link
                    to={`/organizer/events/${event.id}/edit`}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Manage</span>
                  </Link>
                  <Link
                    to={`/organizer/events/${event.id}/operations`}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Operations</span>
                  </Link>

                  {isDraft && (
                    <button
                      type="button"
                      onClick={() => setEventToPublish(event)}
                      disabled={isBusy}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isPublishing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>{isPublishing ? "Publishing…" : "Publish"}</span>
                    </button>
                  )}

                  <ActionMenu label={`Actions for ${event.title}`}>
                    {/* Mobile-only: Manage */}
                    <Link
                      to={`/organizer/events/${event.id}/edit`}
                      className="sm:hidden w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                      <span>Manage</span>
                    </Link>
                    <Link
                      to={`/organizer/events/${event.id}/operations`}
                      className="sm:hidden w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Operations</span>
                    </Link>
                    {isDraft && (
                      <div className="sm:hidden">
                        <MenuButton
                          icon={Send}
                          label={isPublishing ? "Publishing…" : "Publish"}
                          onClick={() => setEventToPublish(event)}
                          disabled={isBusy}
                          loading={isPublishing}
                        />
                      </div>
                    )}
                    <MenuButton
                      icon={Trash2}
                      label={isDeleting ? "Deleting…" : "Delete"}
                      onClick={() => setEventToDelete(event)}
                      disabled={isBusy}
                      loading={isDeleting}
                      danger
                    />
                  </ActionMenu>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Standalone Activity Cards ── */}
        {standaloneActivities.map((activity) => {
          const isDraft = !activity.status || activity.status === "DRAFT";
          const isPublishing = publishingActivityIds.has(activity.id);
          const isDeleting = deletingActivityIds.has(activity.id);
          const isStarting = startingActivityIds.has(activity.id);
          const isCompleting = completingActivityIds.has(activity.id);
          const isPublished = activity.status === "PUBLISHED";
          const isOngoing = activity.status === "ONGOING";
          const hasEnded =
            Boolean(activity.endDateTime) &&
            new Date(activity.endDateTime).getTime() <= Date.now();
          const isNotStarted = isPublished && hasEnded;
          const canStart = isPublished && !hasEnded;
          const isBusy = isPublishing || isDeleting || isStarting || isCompleting;

          const typeBadgeStyle = getActivityTypeBadgeStyle(activity.type);

          return (
            <div
              key={`activity-${activity.id}`}
              className={`group bg-white border rounded-xl transition-all duration-200 hover:shadow-md ${
                isBusy
                  ? "border-slate-200 opacity-70"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="px-5 py-4 flex items-start gap-4">
                {/* Left: Icon Indicator */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${typeBadgeStyle}`}>
                  <Trophy className="w-5 h-5" />
                </div>

                {/* Center: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <button
                      type="button"
                      onClick={() => setSelectedActivity(activity)}
                      className="text-sm font-semibold text-slate-900 hover:text-indigo-700 transition-colors truncate text-left cursor-pointer max-w-[280px] sm:max-w-none"
                      title={activity.name}
                    >
                      {activity.name}
                    </button>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                      isNotStarted
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : isDraft
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {isNotStarted ? "Not started" : isDraft ? "Draft" : activity.status}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${typeBadgeStyle}`}>
                      {getActivityTypeLabel(activity.type)}
                    </span>
                  </div>

                  {activity.description && (
                    <p className="text-xs text-slate-500 line-clamp-1 mb-2 max-w-xl">
                      {activity.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                      {formatDateRange(activity.startDateTime, activity.endDateTime)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      {activity.location || "No venue set"}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedActivity(activity)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>View</span>
                  </button>
                  <Link
                    to={`/organizer/activities/${activity.id}/operations`}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Operations</span>
                  </Link>

                  {canStart && onStartActivity && (
                    <button
                      type="button"
                      onClick={() => setActivityToStart(activity)}
                      disabled={isBusy}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isStarting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                      )}
                      <span>{isStarting ? "Starting…" : "Start"}</span>
                    </button>
                  )}

                  {isOngoing && onCompleteActivity && (
                    <button
                      type="button"
                      onClick={() => setActivityToComplete(activity)}
                      disabled={isBusy}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isCompleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>{isCompleting ? "Completing…" : "Complete"}</span>
                    </button>
                  )}

                  {isDraft && (
                    <button
                      type="button"
                      onClick={() => setActivityToPublish(activity)}
                      disabled={isBusy}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isPublishing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>{isPublishing ? "Publishing…" : "Publish"}</span>
                    </button>
                  )}

                  <ActionMenu label={`Actions for ${activity.name}`}>
                    {/* Mobile-only: View Details */}
                    <div className="sm:hidden">
                      <MenuButton
                        icon={Eye}
                        label="View Details"
                        onClick={() => setSelectedActivity(activity)}
                      />
                    </div>
                    <div className="sm:hidden">
                      <MenuButton
                        icon={ClipboardCheck}
                        label="Operations"
                        onClick={() => window.location.href = `/organizer/activities/${activity.id}/operations`}
                      />
                    </div>
                    {canStart && onStartActivity && (
                      <div className="sm:hidden">
                        <MenuButton
                          icon={Play}
                          label={isStarting ? "Starting…" : "Start"}
                          onClick={() => setActivityToStart(activity)}
                          disabled={isBusy}
                          loading={isStarting}
                        />
                      </div>
                    )}
                    {isOngoing && onCompleteActivity && (
                      <div className="sm:hidden">
                        <MenuButton
                          icon={CheckCircle2}
                          label={isCompleting ? "Completing…" : "Complete"}
                          onClick={() => setActivityToComplete(activity)}
                          disabled={isBusy}
                          loading={isCompleting}
                        />
                      </div>
                    )}
                    {isDraft && (
                      <div className="sm:hidden">
                        <MenuButton
                          icon={Send}
                          label={isPublishing ? "Publishing…" : "Publish"}
                          onClick={() => setActivityToPublish(activity)}
                          disabled={isBusy}
                          loading={isPublishing}
                        />
                      </div>
                    )}
                    <MenuButton
                      icon={Trash2}
                      label={isDeleting ? "Deleting…" : "Delete"}
                      onClick={() => setActivityToDelete(activity)}
                      disabled={isBusy}
                      loading={isDeleting}
                      danger
                    />
                  </ActionMenu>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer count */}
      <div className="mt-3 px-1 text-xs text-slate-400">
        {totalCount} {totalCount === 1 ? "item" : "items"} total
        {events.length > 0 && standaloneActivities.length > 0 && (
          <span>
            {" "}· {events.length} {events.length === 1 ? "event" : "events"}, {standaloneActivities.length} {standaloneActivities.length === 1 ? "activity" : "activities"}
          </span>
        )}
      </div>

      {/* Activity Details Modal */}
      <ActivityDetailsModal
        isOpen={Boolean(selectedActivity)}
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(eventToDelete)}
        title="Delete this event?"
        message={`Are you sure you want to delete "${eventToDelete?.title || "this event"}"? All associated activities will also be deleted.`}
        confirmLabel="Delete Event"
        cancelLabel="Cancel"
        isDestructive
        isLoading={eventToDelete ? deletingIds.has(eventToDelete.id) : false}
        onConfirm={handleConfirmDelete}
        onCancel={() => setEventToDelete(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(activityToPublish)}
        title="Publish this competition?"
        message={`Publishing "${activityToPublish?.name || "this competition"}" will make it available for student registrations.`}
        confirmLabel="Publish Competition"
        cancelLabel="Keep as Draft"
        isLoading={activityToPublish ? publishingActivityIds.has(activityToPublish.id) : false}
        onConfirm={handleConfirmActivityPublish}
        onCancel={() => setActivityToPublish(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(eventToPublish)}
        title="Publish this event?"
        message={`Publishing "${eventToPublish?.title || "this event"}" will make it available for student registrations.`}
        confirmLabel="Publish Event"
        cancelLabel="Keep as Draft"
        isLoading={eventToPublish ? publishingIds.has(eventToPublish.id) : false}
        onConfirm={handleConfirmPublish}
        onCancel={() => setEventToPublish(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(activityToStart)}
        title="Start this activity now?"
        message={`Starting "${activityToStart?.name || "this activity"}" will make it ONGOING immediately so activity check-in can begin.`}
        confirmLabel="Start Activity"
        cancelLabel="Cancel"
        isLoading={activityToStart ? startingActivityIds.has(activityToStart.id) : false}
        onConfirm={handleConfirmActivityStart}
        onCancel={() => setActivityToStart(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(activityToComplete)}
        title="Complete this activity?"
        message={`Completing "${activityToComplete?.name || "this activity"}" will close activity check-in.`}
        confirmLabel="Complete Activity"
        cancelLabel="Cancel"
        isLoading={activityToComplete ? completingActivityIds.has(activityToComplete.id) : false}
        onConfirm={handleConfirmActivityComplete}
        onCancel={() => setActivityToComplete(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(activityToDelete)}
        title="Delete this activity?"
        message={`Are you sure you want to delete "${activityToDelete?.name || "this activity"}"? This action cannot be undone.`}
        confirmLabel="Delete Activity"
        cancelLabel="Cancel"
        isDestructive
        isLoading={activityToDelete ? deletingActivityIds.has(activityToDelete.id) : false}
        onConfirm={handleConfirmActivityDelete}
        onCancel={() => setActivityToDelete(null)}
      />
    </>
  );
}
