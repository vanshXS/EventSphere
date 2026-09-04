import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  MapPin, 
  Trash2, 
  Send, 
  ChevronRight,
  SlidersHorizontal,
  Globe
} from "lucide-react";
import EventStatusBadge from "./EventStatusBadge";
import ConfirmDialog from "./ConfirmDialog";
import { formatDateRange, getVisibilityLabel } from "../utils/eventHelpers";

export default function EventCard({ 
  event, 
  onPublish, 
  onDelete, 
  isPublishing = false, 
  isDeleting = false 
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const isDraft = event.status === "DRAFT" || event.eventStatus === "DRAFT";

  const handleConfirmPublish = async () => {
    try {
      await onPublish(event.id);
      setShowPublishModal(false);
    } catch {
      // Handled by parent
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await onDelete(event.id);
      setShowDeleteModal(false);
    } catch {
      // Handled by parent
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div className="space-y-2.5">
          {/* Header Row: Title & Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 inline-flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400" />
                  <span>{getVisibilityLabel(event.visibility)}</span>
                </span>
                <EventStatusBadge status={event.status} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                <Link 
                  to={`/organizer/events/${event.id}/edit`}
                  className="hover:text-indigo-600 transition-colors truncate block"
                >
                  {event.title}
                </Link>
              </h3>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Schedule & Venue Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="font-medium text-slate-700">
                {formatDateRange(event.startDateTime, event.endDateTime)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{event.venue || "Venue not set"}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {isDraft ? (
            <>
              {/* Delete button */}
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={isDeleting || isPublishing}
                aria-label={`Delete event ${event.title}`}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 py-1.5 px-2 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              {/* Manage & Publish Actions */}
              <div className="flex items-center gap-2">
                <Link
                  to={`/organizer/events/${event.id}/edit`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                  <span>Manage Activities</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowPublishModal(true)}
                  disabled={isPublishing || isDeleting}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish</span>
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-end">
              <Link
                to={`/organizer/events/${event.id}/edit`}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 rounded-lg transition-colors"
              >
                <span>Manage Activities & Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title="Delete this event?"
        message={`Are you sure you want to delete "${event.title}"? All scheduled activities under this event will also be deleted.`}
        confirmLabel="Delete Event"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Publish Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showPublishModal}
        title="Publish this event?"
        message={`Publishing "${event.title}" will make it public for student registrations.`}
        confirmLabel="Publish Event"
        cancelLabel="Keep as Draft"
        isDestructive={false}
        isLoading={isPublishing}
        onConfirm={handleConfirmPublish}
        onCancel={() => setShowPublishModal(false)}
      />
    </>
  );
}
