import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Send, SlidersHorizontal, Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import EventStatusBadge from "./EventStatusBadge";
import { formatDateRange, getVisibilityLabel } from "../utils/eventHelpers";

export default function EventTable({
  events,
  onPublish,
  onDelete,
  publishingIds = new Set(),
  deletingIds = new Set()
}) {
  const [eventToDelete, setEventToDelete] = useState(null);
  const [eventToPublish, setEventToPublish] = useState(null);

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

  return (
    <>
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <caption className="sr-only">Events you can manage</caption>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th scope="col" className="px-5 py-3">Event</th>
                <th scope="col" className="px-4 py-3">Schedule</th>
                <th scope="col" className="px-4 py-3">Venue</th>
                <th scope="col" className="px-4 py-3">Visibility</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => {
                const isDraft = event.status === "DRAFT";
                const isPublishing = publishingIds.has(event.id);
                const isDeleting = deletingIds.has(event.id);

                return (
                  <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 align-top max-w-[260px]">
                      <Link
                        to={`/organizer/events/${event.id}/edit`}
                        className="block text-sm font-semibold text-slate-900 hover:text-indigo-700 transition-colors truncate"
                        title={event.title}
                      >
                        {event.title}
                      </Link>
                      {event.description && (
                        <p className="mt-1 text-xs leading-5 text-slate-500 line-clamp-1">
                          {event.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-xs text-slate-600 whitespace-nowrap">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" aria-hidden="true" />
                        <span>{formatDateRange(event.startDateTime, event.endDateTime)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-xs text-slate-600 max-w-[180px]">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" aria-hidden="true" />
                        <span className="truncate">{event.venue || "Not set"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-xs text-slate-600 whitespace-nowrap">
                      {getVisibilityLabel(event.visibility)}
                    </td>
                    <td className="px-4 py-4 align-top whitespace-nowrap">
                      <EventStatusBadge status={event.status} />
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex justify-end items-center gap-2 whitespace-nowrap">
                        <Link
                          to={`/organizer/events/${event.id}/edit`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Manage</span>
                        </Link>
                        {isDraft && (
                          <>
                            <button
                              type="button"
                              onClick={() => setEventToPublish(event)}
                              disabled={isPublishing || isDeleting}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{isPublishing ? "Publishing..." : "Publish"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEventToDelete(event)}
                              disabled={isPublishing || isDeleting}
                              aria-label={`Delete ${event.title}`}
                              title="Delete event"
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
          {events.length} {events.length === 1 ? "event" : "events"} shown
        </div>
      </div>

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
        isOpen={Boolean(eventToPublish)}
        title="Publish this event?"
        message={`Publishing "${eventToPublish?.title || "this event"}" will make it available for student registrations.`}
        confirmLabel="Publish Event"
        cancelLabel="Keep as Draft"
        isLoading={eventToPublish ? publishingIds.has(eventToPublish.id) : false}
        onConfirm={handleConfirmPublish}
        onCancel={() => setEventToPublish(null)}
      />
    </>
  );
}
