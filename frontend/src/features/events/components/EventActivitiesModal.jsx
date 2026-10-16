import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  X,
  Play,
  CheckCircle,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Loader2,
  ExternalLink,
  Layers,
  Activity,
  Sliders,
  TrendingUp,
  ShieldAlert
} from "lucide-react";
import {
  getActivitySummariesByEvent,
  startActivity,
  completeActivity
} from "../../activities/activityApi";
import {
  getActivityTypeLabel,
  getActivityTypeBadgeStyle
} from "../../activities/utils/activityHelpers";
import { formatDateRange, formatDateTime } from "../utils/eventHelpers";

export default function EventActivitiesModal({
  isOpen,
  event,
  onClose,
  onActivityStatusChange
}) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actioningIds, setActioningIds] = useState(new Set());

  // Close on Escape & prevent background scrolling
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  // Fetch activity summaries
  const loadSummaries = useCallback(async (isSilent = false) => {
    if (!event?.id) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const data = await getActivitySummariesByEvent(event.id);
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load activity summaries:", err);
      setError(
        err.response?.data?.message || "Could not load activities for this event."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [event?.id]);

  useEffect(() => {
    if (isOpen && event?.id) {
      loadSummaries();
    }
  }, [isOpen, event?.id, loadSummaries]);

  // Handle start activity
  const handleStart = async (activityId) => {
    setActioningIds((prev) => new Set(prev).add(activityId));
    setError("");
    setActionSuccess("");
    try {
      await startActivity(event.id, activityId);
      setActionSuccess("Activity started successfully! Live check-in scanner is now unlocked.");
      await loadSummaries(true);
      if (onActivityStatusChange) onActivityStatusChange();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start activity.");
    } finally {
      setActioningIds((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }
  };

  // Handle complete activity
  const handleComplete = async (activityId) => {
    setActioningIds((prev) => new Set(prev).add(activityId));
    setError("");
    setActionSuccess("");
    try {
      await completeActivity(event.id, activityId);
      setActionSuccess("Activity marked as completed! Scanning is now closed.");
      await loadSummaries(true);
      if (onActivityStatusChange) onActivityStatusChange();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete activity.");
    } finally {
      setActioningIds((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }
  };

  if (!isOpen || !event) return null;

  const totalRegistrations = activities.reduce(
    (sum, a) => sum + (Number(a.totalRegistrations) || 0),
    0
  );
  const totalApproved = activities.reduce(
    (sum, a) => sum + (Number(a.approvedRegistrations) || 0),
    0
  );
  const totalPending = activities.reduce(
    (sum, a) => sum + (Number(a.pendingApprovalCount) || 0),
    0
  );
  const totalAttendance = activities.reduce(
    (sum, a) => sum + (Number(a.attendanceCount) || 0),
    0
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Event Activities
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700">
                  {activities.length} {activities.length === 1 ? "Activity" : "Activities"}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 truncate" title={event.title}>
                {event.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadSummaries(true)}
              disabled={refreshing || loading}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Activities"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Banner Messages */}
        {error && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-100 text-rose-800 text-xs font-medium flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError("")}
              className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs font-medium flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess("")}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Quick Summary Metric Strip */}
        {!loading && activities.length > 0 && (
          <div className="px-6 py-3 bg-white border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-center">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Activities
              </span>
              <span className="text-lg font-black text-slate-800">
                {activities.length}
              </span>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-2.5 text-center">
              <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Total Registrations
              </span>
              <span className="text-lg font-black text-emerald-700">
                {totalRegistrations}
              </span>
            </div>
            <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-2.5 text-center">
              <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                Pending Approvals
              </span>
              <span className="text-lg font-black text-amber-700">
                {totalPending}
              </span>
            </div>
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-2.5 text-center">
              <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                Total Attendance
              </span>
              <span className="text-lg font-black text-indigo-700">
                {totalAttendance}
              </span>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-slate-500">
                Loading activities and operations metrics...
              </p>
            </div>
          ) : activities.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Activities Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This event currently does not have any activities. You can create activities inside the event editor.
              </p>
              <div className="pt-2">
                <Link
                  to={`/organizer/events/${event.id}/edit`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Add Activities in Event Editor
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => {
                const isCompleted = act.status === "COMPLETED" || Boolean(act.actualEndDateTime);
                const isOngoing = (act.status === "ONGOING" || Boolean(act.actualStartDateTime)) && !isCompleted;
                const isDraft = act.status === "DRAFT" && !act.actualStartDateTime;
                const canStart = !isOngoing && !isCompleted;
                const isActioning = actioningIds.has(act.id);

                const statusStyles = isCompleted
                  ? "bg-slate-100 text-slate-600 border-slate-200"
                  : isOngoing
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse"
                  : isDraft
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200";

                return (
                  <div
                    key={act.id}
                    className={`bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all duration-200 overflow-hidden ${
                      isActioning ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    <div className="p-4 sm:p-5">
                      {/* Top: Name, Status, Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {act.name}
                            </h4>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusStyles}`}
                            >
                              {isCompleted ? "COMPLETED" : isOngoing ? "ONGOING" : act.status || "PUBLISHED"}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getActivityTypeBadgeStyle(
                                act.type
                              )}`}
                            >
                              {getActivityTypeLabel(act.type)}
                            </span>
                          </div>

                          {act.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                              {act.description}
                            </p>
                          )}

                          {/* Timings: Scheduled, Actual Start, Actual End */}
                          <div className="flex items-center gap-3.5 flex-wrap text-xs text-slate-500 mt-2">
                            {act.startDateTime && (
                              <span className="inline-flex items-center gap-1.5 text-slate-600">
                                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Scheduled: {formatDateRange(act.startDateTime, act.endDateTime)}</span>
                              </span>
                            )}
                            {act.actualStartDateTime && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[11px]">
                                <Play className="w-3 h-3 fill-emerald-600" />
                                <span>Started: {formatDateTime(act.actualStartDateTime)}</span>
                              </span>
                            )}
                            {act.actualEndDateTime && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                                <CheckCircle2 className="w-3 h-3 text-slate-500" />
                                <span>Ended: {formatDateTime(act.actualEndDateTime)}</span>
                              </span>
                            )}
                            {act.location && (
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {act.location}
                              </span>
                            )}
                            {act.capacity && (
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                Capacity: {act.capacity}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Start / Complete Action Buttons (Matching Standalone Activity!) */}
                        <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                          {canStart && (
                            <button
                              type="button"
                              onClick={() => handleStart(act.id)}
                              disabled={isActioning}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                            >
                              {isActioning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current" />
                              )}
                              <span>{isActioning ? "Starting…" : "Start Activity"}</span>
                            </button>
                          )}

                          {isOngoing && (
                            <button
                              type="button"
                              onClick={() => handleComplete(act.id)}
                              disabled={isActioning}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                            >
                              {isActioning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>{isActioning ? "Completing…" : "Complete Activity"}</span>
                            </button>
                          )}

                          {isCompleted && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg border border-slate-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                              Finished
                            </span>
                          )}

                          <Link
                            to={`/organizer/events/${event.id}/operations?tab=activities`}
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Open Operations Console"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>

                      {/* Operational Metrics Breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-100">
                        <div className="bg-slate-50 rounded-lg p-2 text-center">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Registered
                          </span>
                          <span className="text-base font-extrabold text-slate-800">
                            {act.totalRegistrations || 0}
                          </span>
                        </div>
                        <div className="bg-emerald-50/70 rounded-lg p-2 text-center">
                          <span className="block text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                            Approved
                          </span>
                          <span className="text-base font-extrabold text-emerald-700">
                            {act.approvedRegistrations || 0}
                          </span>
                        </div>
                        <div
                          className={`rounded-lg p-2 text-center ${
                            act.pendingApprovalCount > 0
                              ? "bg-amber-100/70 border border-amber-200 text-amber-800"
                              : "bg-amber-50/70 text-amber-700"
                          }`}
                        >
                          <span className="block text-[9px] font-bold uppercase tracking-wider">
                            Pending
                          </span>
                          <span className="text-base font-extrabold">
                            {act.pendingApprovalCount || 0}
                          </span>
                        </div>
                        <div className="bg-indigo-50/70 rounded-lg p-2 text-center">
                          <span className="block text-[9px] font-bold text-indigo-600 uppercase tracking-wider">
                            Attendance
                          </span>
                          <span className="text-base font-extrabold text-indigo-700">
                            {act.attendanceCount || 0}
                          </span>
                        </div>
                        <div className="bg-purple-50/70 rounded-lg p-2 text-center">
                          <span className="block text-[9px] font-bold text-purple-600 uppercase tracking-wider">
                            Turnout
                          </span>
                          <span className="text-base font-extrabold text-purple-700">
                            {act.turnoutRate || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <Link
            to={`/organizer/events/${event.id}/operations`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <span>Open Full Operations Hub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
