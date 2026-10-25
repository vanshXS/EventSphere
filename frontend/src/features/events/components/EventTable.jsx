import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  Layers,
  Loader2,
  MapPin,
  MoreVertical,
  Play,
  Send,
  SlidersHorizontal,
  Trash2,
  Trophy,
  UserCheck
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import EventStatusBadge from "./EventStatusBadge";
import { formatDateRange } from "../utils/eventHelpers";
import {
  getActivityTypeLabel,
  getActivityTypeBadgeStyle
} from "../../activities/utils/activityHelpers";
import ActivityDetailsModal from "../../activities/components/ActivityDetailsModal";
import EventActivitiesModal from "./EventActivitiesModal";
import ActivityRegistrationsModal from "../../registration/components/ActivityRegistrationsModal";

function ActionMenu({ children, label = "Actions" }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !buttonRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const button = buttonRef.current;
      const menu = menuRef.current;
      if (!button || !menu) return;

      const buttonBounds = button.getBoundingClientRect();
      const menuBounds = menu.getBoundingClientRect();
      setPosition({
        top: Math.max(
          8,
          Math.min(buttonBounds.bottom + 4, window.innerHeight - menuBounds.height - 8)
        ),
        left: Math.max(
          8,
          Math.min(buttonBounds.right - menuBounds.width, window.innerWidth - menuBounds.width - 8)
        )
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <div className="relative flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setPosition(null);
          setOpen((current) => !current);
        }}
        aria-label={label}
        aria-expanded={open}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          onClick={() => setOpen(false)}
          className="fixed z-[60] w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg animate-fade-in"
          style={{
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            visibility: position ? "visible" : "hidden"
          }}
        >
          {children}
        </div>,
        document.body
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
      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5 shrink-0" />
      )}
      <span>{label}</span>
    </button>
  );
}

function MenuLink({ to, icon: Icon, children }) {
  return (
    <Link
      to={to}
      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </Link>
  );
}

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
  const navigate = useNavigate();
  const [eventToDelete, setEventToDelete] = useState(null);
  const [eventToPublish, setEventToPublish] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedEventForActivities, setSelectedEventForActivities] = useState(null);
  const [activityToPublish, setActivityToPublish] = useState(null);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [activityToStart, setActivityToStart] = useState(null);
  const [activityToComplete, setActivityToComplete] = useState(null);
  const [selectedActivityForRegistrations, setSelectedActivityForRegistrations] = useState(null);
  const [copiedId, setCopiedId] = useState("");
  const [currentTime, setCurrentTime] = useState(null);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now());
    updateCurrentTime();
    const intervalId = setInterval(updateCurrentTime, 60_000);
    return () => clearInterval(intervalId);
  }, []);

  const handleCopyLink = async (url, id) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2000);
    } catch {
      // The clipboard may be unavailable in the current browser context.
    }
  };

  const handleRowClick = (event, path) => {
    if (event.target.closest("a, button")) return;
    navigate(path);
  };

  const handleRowKeyDown = (event, path) => {
    if (event.target.closest("a, button")) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(path);
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
      <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th scope="col" className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Name</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Schedule &amp; Venue</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th scope="col" className="w-14 px-3 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => {
                const path = `/organizer/events/${event.id}/operations`;
                const isDraft = event.status === "DRAFT" || event.eventStatus === "DRAFT";
                const isPublishing = publishingIds.has(event.id);
                const isDeleting = deletingIds.has(event.id);
                const isBusy = isPublishing || isDeleting;

                return (
                  <tr
                    key={`event-${event.id}`}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open operations for ${event.title}`}
                    onClick={(clickEvent) => handleRowClick(clickEvent, path)}
                    onKeyDown={(keyEvent) => handleRowKeyDown(keyEvent, path)}
                    className={`cursor-pointer transition-colors hover:bg-indigo-50/40 focus:bg-indigo-50/40 focus:outline-none ${
                      isBusy ? "opacity-60" : ""
                    }`}
                  >
                    <td className="max-w-[340px] px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
                          <Layers className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900">{event.title}</span>
                          {event.description && (
                            <span className="mt-0.5 block truncate text-xs text-slate-500">{event.description}</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Activity className="h-3.5 w-3.5 text-purple-500" />
                        Event
                        <span className="text-slate-400">·</span>
                        {event.activityCount || 0} {event.activityCount === 1 ? "activity" : "activities"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="block whitespace-nowrap text-xs font-medium text-slate-700">
                        <Calendar className="mr-1.5 inline h-3.5 w-3.5 text-indigo-500" />
                        {formatDateRange(event.startDateTime, event.endDateTime)}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        <MapPin className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />
                        {event.venue || "No venue set"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <EventStatusBadge status={event.status || event.eventStatus} />
                    </td>
                    <td className="px-3 py-3" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                      <ActionMenu label={`Options for ${event.title}`}>
                        <MenuLink to={path} icon={Layers}>Open operations</MenuLink>
                        <MenuButton
                          icon={Activity}
                          label={`Activities (${event.activityCount || 0})`}
                          onClick={() => setSelectedEventForActivities(event)}
                        />
                        <MenuLink to={`/organizer/events/${event.id}/edit`} icon={SlidersHorizontal}>Edit event details</MenuLink>
                        {isDraft && (
                          <MenuButton
                            icon={Send}
                            label={isPublishing ? "Publishing…" : "Publish event"}
                            onClick={() => setEventToPublish(event)}
                            disabled={isBusy}
                            loading={isPublishing}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(`${window.location.origin}${path}`, event.id)}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                        >
                          {copiedId === event.id
                            ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            : <Copy className="h-3.5 w-3.5 shrink-0" />}
                          <span>{copiedId === event.id ? "Link copied" : "Copy operations link"}</span>
                        </button>
                        <div className="my-1 border-t border-slate-100" />
                        <MenuButton
                          icon={Trash2}
                          label={isDeleting ? "Deleting…" : "Delete event"}
                          onClick={() => setEventToDelete(event)}
                          disabled={isBusy}
                          loading={isDeleting}
                          danger
                        />
                      </ActionMenu>
                    </td>
                  </tr>
                );
              })}

              {standaloneActivities.map((activity) => {
                const path = `/organizer/activities/${activity.id}/operations`;
                const isDraft = !activity.status || activity.status === "DRAFT";
                const isPublishing = publishingActivityIds.has(activity.id);
                const isDeleting = deletingActivityIds.has(activity.id);
                const isStarting = startingActivityIds.has(activity.id);
                const isCompleting = completingActivityIds.has(activity.id);
                const isPublished = activity.status === "PUBLISHED";
                const isOngoing = activity.status === "ONGOING";
                const hasEnded = Boolean(activity.endDateTime) &&
                  currentTime !== null &&
                  new Date(activity.endDateTime).getTime() <= currentTime;
                const isNotStarted = isPublished && hasEnded;
                const canStart = isPublished && currentTime !== null && !hasEnded;
                const isBusy = isPublishing || isDeleting || isStarting || isCompleting;
                const typeBadgeStyle = getActivityTypeBadgeStyle(activity.type);
                const statusClass = isNotStarted
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : isOngoing
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : isDraft
                  ? "border-slate-200 bg-slate-100 text-slate-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700";

                return (
                  <tr
                    key={`activity-${activity.id}`}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open operations for ${activity.name}`}
                    onClick={(clickEvent) => handleRowClick(clickEvent, path)}
                    onKeyDown={(keyEvent) => handleRowKeyDown(keyEvent, path)}
                    className={`cursor-pointer transition-colors hover:bg-indigo-50/40 focus:bg-indigo-50/40 focus:outline-none ${
                      isBusy ? "opacity-60" : ""
                    }`}
                  >
                    <td className="max-w-[340px] px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${typeBadgeStyle}`}>
                          <Trophy className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900">{activity.name}</span>
                          {activity.description && (
                            <span className="mt-0.5 block truncate text-xs text-slate-500">{activity.description}</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold ${typeBadgeStyle}`}>
                        {getActivityTypeLabel(activity.type)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="block whitespace-nowrap text-xs font-medium text-slate-700">
                        <Calendar className="mr-1.5 inline h-3.5 w-3.5 text-indigo-500" />
                        {formatDateRange(activity.startDateTime, activity.endDateTime)}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        <MapPin className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />
                        {activity.location || "No venue set"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold ${statusClass}`}>
                        {isNotStarted ? "Not started" : isDraft ? "Draft" : activity.status}
                      </span>
                    </td>
                    <td className="px-3 py-3" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                      <ActionMenu label={`Options for ${activity.name}`}>
                        <MenuLink to={path} icon={Layers}>Open operations</MenuLink>
                        <MenuButton icon={Eye} label="View full details" onClick={() => setSelectedActivity(activity)} />
                        <MenuButton
                          icon={UserCheck}
                          label="Review registrations"
                          onClick={() => setSelectedActivityForRegistrations(activity)}
                        />
                        {isDraft && (
                          <MenuButton
                            icon={Send}
                            label={isPublishing ? "Publishing…" : "Publish competition"}
                            onClick={() => setActivityToPublish(activity)}
                            disabled={isBusy}
                            loading={isPublishing}
                          />
                        )}
                        {canStart && onStartActivity && (
                          <MenuButton
                            icon={Play}
                            label={isStarting ? "Starting…" : "Start competition"}
                            onClick={() => setActivityToStart(activity)}
                            disabled={isBusy}
                            loading={isStarting}
                          />
                        )}
                        {isOngoing && onCompleteActivity && (
                          <MenuButton
                            icon={CheckCircle2}
                            label={isCompleting ? "Completing…" : "Complete competition"}
                            onClick={() => setActivityToComplete(activity)}
                            disabled={isBusy}
                            loading={isCompleting}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(`${window.location.origin}${path}`, activity.id)}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                        >
                          {copiedId === activity.id
                            ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            : <Copy className="h-3.5 w-3.5 shrink-0" />}
                          <span>{copiedId === activity.id ? "Link copied" : "Copy operations link"}</span>
                        </button>
                        <div className="my-1 border-t border-slate-100" />
                        <MenuButton
                          icon={Trash2}
                          label={isDeleting ? "Deleting…" : "Delete competition"}
                          onClick={() => setActivityToDelete(activity)}
                          disabled={isBusy}
                          loading={isDeleting}
                          danger
                        />
                      </ActionMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
          Showing {totalCount} {totalCount === 1 ? "managed item" : "managed items"}
          {events.length > 0 && standaloneActivities.length > 0 && (
            <span>
              {" "}· {events.length} {events.length === 1 ? "event" : "events"}, {standaloneActivities.length} {standaloneActivities.length === 1 ? "competition" : "competitions"}
            </span>
          )}
        </div>
      </div>

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

      <EventActivitiesModal
        isOpen={Boolean(selectedEventForActivities)}
        event={selectedEventForActivities}
        onClose={() => setSelectedEventForActivities(null)}
      />

      <ActivityRegistrationsModal
        isOpen={Boolean(selectedActivityForRegistrations)}
        activity={selectedActivityForRegistrations}
        onClose={() => setSelectedActivityForRegistrations(null)}
      />
    </>
  );
}
