import React, { useState } from "react";
import { 
  Plus, 
  Layers, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  CalendarDays 
} from "lucide-react";
import ActivityCard from "./ActivityCard";
import ActivityFormModal from "./ActivityFormModal";

export default function ActivityList({
  eventId,
  parentEvent,
  activities = [],
  loading = false,
  error = "",
  onActivityCreated,
  onActivityDeleted,
  onActivityStarted,
  onActivityCompleted,
  deletingActivityIds = new Set(),
  startingActivityIds = new Set(),
  completingActivityIds = new Set(),
  onRefresh
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt || b.startDateTime || 0) - new Date(a.createdAt || a.startDateTime || 0)
  );

  const handleCreated = (newActivity) => {
    if (onActivityCreated) {
      onActivityCreated(newActivity, editingActivity?.id);
    }
    setEditingActivity(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Section Header with + Add Activity */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Activities & Sub-events
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {activities.length} {activities.length === 1 ? "activity" : "activities"}
            </span>
          </div>
          <p className="text-xs text-slate-500 pl-9">
            Workshops, competitions, and sessions scheduled under this event
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Activity</span>
        </button>
      </div>

      {/* State 1: Error */}
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer shrink-0"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* State 2: Loading Skeleton */}
      {loading && (
        <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-slate-200/60 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading activities...</p>
        </div>
      )}

      {/* State 3: Empty State */}
      {!loading && !error && activities.length === 0 && (
        <div className="bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-8 sm:p-10 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-2xs">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="text-sm font-semibold text-slate-900">
              No activities added yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Add competitions, workshops, or exhibitions that participants can register for within this event.
            </p>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add your first activity</span>
            </button>
          </div>
        </div>
      )}

      {/* State 4: Activities List */}
      {!loading && sortedActivities.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5">
          {sortedActivities.map((activity) => (
            <ActivityCard
              key={activity.id || activity.name}
              activity={activity}
              onEdit={() => { setEditingActivity(activity); setShowAddModal(true); }}
              onDelete={onActivityDeleted ? () => onActivityDeleted(activity.id) : undefined}
              onStart={onActivityStarted ? () => onActivityStarted(activity.id) : undefined}
              onComplete={onActivityCompleted ? () => onActivityCompleted(activity.id) : undefined}
              isDeleting={deletingActivityIds.has(activity.id)}
              isStarting={startingActivityIds.has(activity.id)}
              isCompleting={completingActivityIds.has(activity.id)}
            />
          ))}
        </div>
      )}

      {/* Add Activity Modal Dialog */}
      <ActivityFormModal
        isOpen={showAddModal}
        eventId={eventId}
        parentEvent={parentEvent}
        editingActivity={editingActivity}
        onClose={() => { setShowAddModal(false); setEditingActivity(null); }}
        onActivityCreated={handleCreated}
      />
    </div>
  );
}
