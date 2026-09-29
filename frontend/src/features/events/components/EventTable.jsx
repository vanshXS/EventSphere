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
  CheckCircle2,
  Copy,
  Check,
  Clock,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import EventStatusBadge from "./EventStatusBadge";
import { formatDateRange } from "../utils/eventHelpers";
import { getActivityTypeLabel, getActivityTypeBadgeStyle } from "../../activities/utils/activityHelpers";
import ActivityDetailsModal from "../../activities/components/ActivityDetailsModal";

/* ─── Floating Action Menu (⋮) ─── */
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
        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
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

/* ─── Main EventTable Component ─── */
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
  const [copiedId, setCopiedId] = useState("");

  const handleCopyLink = async (url, id) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2000);
    } catch {
      // ignore
    }
  };

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
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                    <Layers className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/organizer/events/${event.id}/operations`}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate"
                        title={event.title}
                      >
                        {event.title}
                      </Link>
                      <EventStatusBadge status={event.status} />
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                        Fest / Event
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl">
                        {event.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500 pt-0.5">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        {formatDateRange(event.startDateTime, event.endDateTime)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {event.venue || "No venue set"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Unified Action Group */}
                <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  {/* Primary Action: Operations Console */}
                  <Link
                    to={`/organizer/events/${event.id}/operations`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Operations Hub</span>
                  </Link>

                  {/* Context Action: If Draft, Quick Publish */}
                  {isDraft ? (
                    <button
                      type="button"
                      onClick={() => setEventToPublish(event)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isPublishing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isPublishing ? "Publishing…" : "Publish"}</span>
                    </button>
                  ) : (
                    <Link
                      to={`/organizer/events/${event.id}/edit`}
                      className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>
                  )}

                  {/* Overflow Action Menu (⋮) */}
                  <ActionMenu label={`Options for ${event.title}`}>
                    <Link
                      to={`/organizer/events/${event.id}/edit`}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                      <span>Edit Event Details</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopyLink(
                          `${window.location.origin}/organizer/events/${event.id}/operations`,
                          event.id
                        )
                      }
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {copiedId === event.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{copiedId === event.id ? "Link Copied!" : "Copy Operations Link"}</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <MenuButton
                      icon={Trash2}
                      label={isDeleting ? "Deleting…" : "Delete Event"}
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
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${typeBadgeStyle}`}
                  >
                    <Trophy className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/organizer/activities/${activity.id}/operations`}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate"
                        title={activity.name}
                      >
                        {activity.name}
                      </Link>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          isNotStarted
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : isOngoing
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : isDraft
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {isNotStarted ? "Not started" : isDraft ? "Draft" : activity.status}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider ${typeBadgeStyle}`}
                      >
                        {getActivityTypeLabel(activity.type)}
                      </span>
                    </div>

                    {activity.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl">
                        {activity.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500 pt-0.5">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        {formatDateRange(activity.startDateTime, activity.endDateTime)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {activity.location || "No venue set"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Unified Action Group */}
                <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  {/* Primary Action: Operations Console */}
                  <Link
                    to={`/organizer/activities/${activity.id}/operations`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Operations Hub</span>
                  </Link>

                  {/* Context-Aware Lifecycle Action */}
                  {canStart && onStartActivity && (
                    <button
                      type="button"
                      onClick={() => setActivityToStart(activity)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isStarting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>{isStarting ? "Starting…" : "Start"}</span>
                    </button>
                  )}

                  {isOngoing && onCompleteActivity && (
                    <button
                      type="button"
                      onClick={() => setActivityToComplete(activity)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isCompleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>{isCompleting ? "Completing…" : "Complete"}</span>
                    </button>
                  )}

                  {isDraft && (
                    <button
                      type="button"
                      onClick={() => setActivityToPublish(activity)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isPublishing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isPublishing ? "Publishing…" : "Publish"}</span>
                    </button>
                  )}

                  {/* Overflow Action Menu (⋮) */}
                  <ActionMenu label={`Options for ${activity.name}`}>
                    <MenuButton
                      icon={Eye}
                      label="View Full Details"
                      onClick={() => setSelectedActivity(activity)}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleCopyLink(
                          `${window.location.origin}/organizer/activities/${activity.id}/operations`,
                          activity.id
                        )
                      }
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {copiedId === activity.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{copiedId === activity.id ? "Link Copied!" : "Copy Operations Link"}</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <MenuButton
                      icon={Trash2}
                      label={isDeleting ? "Deleting…" : "Delete Competition"}
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
      <div className="mt-4 px-1 text-xs text-slate-400">
        Showing {totalCount} {totalCount === 1 ? "managed item" : "managed items"}
        {events.length > 0 && standaloneActivities.length > 0 && (
          <span>
            {" "}· {events.length} {events.length === 1 ? "event" : "events"}, {standaloneActivities.length} {standaloneActivities.length === 1 ? "competition" : "competitions"}
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
        title="Start this competition now?"
        message={`Starting "${activityToStart?.name || "this competition"}" will mark it ONGOING so volunteers can immediately begin scanning participant check-ins.`}
        confirmLabel="Start Activity"
        cancelLabel="Cancel"
        isLoading={activityToStart ? startingActivityIds.has(activityToStart.id) : false}
        onConfirm={handleConfirmActivityStart}
        onCancel={() => setActivityToStart(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(activityToComplete)}
        title="Complete this competition?"
        message={`Completing "${activityToComplete?.name || "this competition"}" will conclude the event and close scanning.`}
        confirmLabel="Complete Activity"
        cancelLabel="Cancel"
        isLoading={activityToComplete ? completingActivityIds.has(activityToComplete.id) : false}
        onConfirm={handleConfirmActivityComplete}
        onCancel={() => setActivityToComplete(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(activityToDelete)}
        title="Delete this competition?"
        message={`Are you sure you want to delete "${activityToDelete?.name || "this competition"}"? This action cannot be undone.`}
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
