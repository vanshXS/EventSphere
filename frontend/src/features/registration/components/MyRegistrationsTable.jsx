import React, { useState, useMemo } from "react";
import { 
  BookmarkCheck, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Users, 
  User, 
  MapPin, 
  Clock, 
  Layers, 
  Trophy, 
  Search,
  AlertTriangle
} from "lucide-react";
import { formatDateTime, formatDateRange } from "../../events/utils/eventHelpers";
import { 
  getActivityTypeLabel, 
  getActivityTypeBadgeStyle 
} from "../../activities/utils/activityHelpers";
import ConfirmDialog from "../../events/components/ConfirmDialog";

export default function MyRegistrationsTable({
  registrations = [],
  events = [],
  standaloneActivities = [],
  myTeams = [],
  cancellingId,
  onCancelRegistration,
  onBrowseEvents
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'ACTIVE' | 'CANCELLED'
  const [regToCancel, setRegToCancel] = useState(null);

  // Quick lookup maps for fallback
  const teamsMap = useMemo(() => {
    const map = new Map();
    myTeams.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [myTeams]);

  const activitiesMap = useMemo(() => {
    const map = new Map();
    standaloneActivities.forEach((a) => map.set(a.id, a));
    return map;
  }, [standaloneActivities]);

  const eventsMap = useMemo(() => {
    const map = new Map();
    events.forEach((e) => map.set(e.id, e));
    return map;
  }, [events]);

  // Enriched registration items
  const enrichedRegistrations = useMemo(() => {
    return registrations.map((reg) => {
      const fallbackActivity = activitiesMap.get(reg.activityId);
      const fallbackEvent = reg.eventId ? eventsMap.get(reg.eventId) : null;
      const fallbackTeamName = reg.teamId ? teamsMap.get(reg.teamId) : null;

      const activityName = reg.activityName || fallbackActivity?.name || "Competition Registration";
      const activityType = reg.activityType || fallbackActivity?.type || fallbackActivity?.activityType || "OTHER";
      const eventName = reg.eventName || fallbackEvent?.title || null;
      const teamName = reg.teamName || fallbackTeamName || (reg.teamId ? "Team Registration" : null);
      const startDateTime = reg.startDateTime || fallbackActivity?.startDateTime || fallbackEvent?.startDateTime;
      const endDateTime = reg.endDateTime || fallbackActivity?.endDateTime || fallbackEvent?.endDateTime;
      const location = reg.location || fallbackActivity?.location || fallbackEvent?.venue;

      return {
        ...reg,
        activityName,
        activityType,
        eventName,
        teamName,
        startDateTime,
        endDateTime,
        location,
        isRegistered: reg.status === "REGISTERED"
      };
    });
  }, [registrations, activitiesMap, eventsMap, teamsMap]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return enrichedRegistrations.filter((reg) => {
      if (statusFilter === "ACTIVE" && !reg.isRegistered) return false;
      if (statusFilter === "CANCELLED" && reg.isRegistered) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = reg.activityName.toLowerCase().includes(q);
        const eventMatch = (reg.eventName || "").toLowerCase().includes(q);
        const teamMatch = (reg.teamName || "").toLowerCase().includes(q);
        const locMatch = (reg.location || "").toLowerCase().includes(q);

        return nameMatch || eventMatch || teamMatch || locMatch;
      }

      return true;
    });
  }, [enrichedRegistrations, statusFilter, searchQuery]);

  const activeCount = enrichedRegistrations.filter((r) => r.isRegistered).length;
  const cancelledCount = enrichedRegistrations.filter((r) => !r.isRegistered).length;

  if (!registrations || registrations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
          <BookmarkCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h3 className="text-base font-bold text-slate-900">No Registrations Found</h3>
          <p className="text-xs text-slate-500">
            You have not registered for any events or competitions yet. Explore available campus activities and sign up!
          </p>
        </div>
        <button
          type="button"
          onClick={onBrowseEvents}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-2xs"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Explore Events</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search & Filter Controls */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All ({enrichedRegistrations.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === "ACTIVE"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              Active ({activeCount})
            </button>
            {cancelledCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter("CANCELLED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === "CANCELLED"
                    ? "bg-slate-700 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Cancelled ({cancelledCount})
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by activity, event, or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white focus:bg-white rounded-xl border border-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Registrations Table */}
        {filteredRegistrations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
            <h4 className="text-sm font-bold text-slate-800">No matching registrations</h4>
            <p className="text-xs text-slate-500">Try adjusting your search terms or filter.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th scope="col" className="py-3.5 px-5">Activity & Event</th>
                    <th scope="col" className="py-3.5 px-4">Participation</th>
                    <th scope="col" className="py-3.5 px-4">Schedule / Venue</th>
                    <th scope="col" className="py-3.5 px-4">Status</th>
                    <th scope="col" className="py-3.5 px-4">Registered On</th>
                    <th scope="col" className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRegistrations.map((reg) => {
                    const isBusy = cancellingId === reg.id;
                    const typeBadge = getActivityTypeBadgeStyle(reg.activityType);

                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Activity & Parent Event Name */}
                        <td className="py-4 px-5 align-top max-w-[260px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeBadge}`}>
                                {getActivityTypeLabel(reg.activityType)}
                              </span>
                              {reg.eventName && (
                                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1">
                                  <Layers className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[130px]">{reg.eventName}</span>
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug">
                              {reg.activityName}
                            </h4>
                          </div>
                        </td>

                        {/* Participation (Individual vs Team) */}
                        <td className="py-4 px-4 align-top whitespace-nowrap">
                          {reg.registrationType === "TEAM" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                <Users className="w-3 h-3" />
                                <span>{reg.teamName || "Team"}</span>
                              </span>
                              <span className="block text-[10px] text-slate-400">Team Entry</span>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                <User className="w-3 h-3 text-slate-500" />
                                <span>Individual</span>
                              </span>
                              <span className="block text-[10px] text-slate-400">Single Entry</span>
                            </div>
                          )}
                        </td>

                        {/* Schedule & Venue */}
                        <td className="py-4 px-4 align-top text-xs text-slate-600 max-w-[180px]">
                          <div className="space-y-1">
                            {reg.startDateTime && (
                              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>{formatDateRange(reg.startDateTime, reg.endDateTime)}</span>
                              </div>
                            )}
                            {reg.location && (
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{reg.location}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 align-top whitespace-nowrap">
                          {reg.isRegistered ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              <XCircle className="w-3.5 h-3.5" />
                              Cancelled
                            </span>
                          )}
                        </td>

                        {/* Registered Date */}
                        <td className="py-4 px-4 align-top text-slate-500 whitespace-nowrap text-xs">
                          {formatDateTime(reg.registeredAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 align-top text-right whitespace-nowrap">
                          {reg.isRegistered ? (
                            <button
                              type="button"
                              onClick={() => setRegToCancel(reg)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              <span>Cancel</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No actions</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer info */}
            <div className="px-5 py-3.5 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/40">
              Showing {filteredRegistrations.length} of {enrichedRegistrations.length} registrations ({activeCount} active)
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Cancellation */}
      <ConfirmDialog
        isOpen={Boolean(regToCancel)}
        title="Cancel Registration?"
        message={`Are you sure you want to cancel your registration for "${regToCancel?.activityName}"? You can re-register anytime before the deadline if slots remain.`}
        confirmLabel="Confirm Cancellation"
        cancelLabel="Keep Registration"
        isDestructive={true}
        isLoading={cancellingId === regToCancel?.id}
        onConfirm={async () => {
          if (regToCancel) {
            await onCancelRegistration(regToCancel.id);
            setRegToCancel(null);
          }
        }}
        onCancel={() => setRegToCancel(null)}
      />
    </>
  );
}
