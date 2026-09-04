import React, { useState, useMemo } from "react";
import { 
  Search, 
  Calendar, 
  MapPin, 
  Eye, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  Trophy, 
  Globe, 
  Clock, 
  Users,
  Filter,
  Sparkles
} from "lucide-react";
import { formatDateRange, getVisibilityLabel } from "../../events/utils/eventHelpers";
import { 
  getActivityTypeLabel, 
  getActivityTypeBadgeStyle, 
  formatCapacitySummary,
  isRegistrationOpen,
  isEnded 
} from "../../activities/utils/activityHelpers";

export default function ParticipantEventTable({
  events = [],
  standaloneActivities = [],
  myRegistrations = [],
  onSelectEvent,
  onSelectActivity,
  onRegisterActivity,
  onViewMyRegistrations
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL"); // 'ALL' | 'EVENTS' | 'ACTIVITIES' | 'REGISTERED'

  // Map registered activity IDs for quick lookup
  const registeredActivityIds = useMemo(() => {
    return new Set(
      myRegistrations
        .filter((r) => r.status === "REGISTERED")
        .map((r) => r.activityId)
    );
  }, [myRegistrations]);

  // Unified items list
  const allItems = useMemo(() => {
    const eventItems = events.map((e) => ({
      ...e,
      itemKind: "EVENT",
      sortDate: e.startDateTime ? new Date(e.startDateTime).getTime() : 0
    }));

    const activityItems = standaloneActivities.map((a) => ({
      ...a,
      itemKind: "ACTIVITY",
      sortDate: a.startDateTime ? new Date(a.startDateTime).getTime() : 0
    }));

    return [...eventItems, ...activityItems].sort((a, b) => a.sortDate - b.sortDate);
  }, [events, standaloneActivities]);

  // Filtered items based on search and selected filter tab
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const isEvent = item.itemKind === "EVENT";
      const isActivity = item.itemKind === "ACTIVITY";
      const isRegistered = isActivity && registeredActivityIds.has(item.id);

      // 1. Type Filter
      if (typeFilter === "EVENTS" && !isEvent) return false;
      if (typeFilter === "ACTIVITIES" && !isActivity) return false;
      if (typeFilter === "REGISTERED" && !isRegistered) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (item.title || item.name || "").toLowerCase().includes(q);
        const descMatch = (item.description || "").toLowerCase().includes(q);
        const venueMatch = (item.venue || item.location || "").toLowerCase().includes(q);
        const typeMatch = isActivity ? getActivityTypeLabel(item.type || item.activityType).toLowerCase().includes(q) : false;

        return titleMatch || descMatch || venueMatch || typeMatch;
      }

      return true;
    });
  }, [allItems, typeFilter, searchQuery, registeredActivityIds]);

  const totalEventsCount = events.length;
  const totalActivitiesCount = standaloneActivities.length;
  const totalRegisteredCount = registeredActivityIds.size;

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setTypeFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              typeFilter === "ALL"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Items ({allItems.length})
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter("EVENTS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              typeFilter === "EVENTS"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Events ({totalEventsCount})
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter("ACTIVITIES")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              typeFilter === "ACTIVITIES"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Competitions ({totalActivitiesCount})
          </button>

          {totalRegisteredCount > 0 && (
            <button
              type="button"
              onClick={() => setTypeFilter("REGISTERED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                typeFilter === "REGISTERED"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200"
              }`}
            >
              My Registered ({totalRegisteredCount})
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events, competitions, venues..."
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

      {/* Main Table Structure */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No matching events or competitions</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search keywords or switching your filter tabs.
          </p>
          {(searchQuery || typeFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("ALL");
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer pt-2"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-5 py-3.5">Category</th>
                  <th scope="col" className="px-4 py-3.5">Title & Overview</th>
                  <th scope="col" className="px-4 py-3.5">Schedule</th>
                  <th scope="col" className="px-4 py-3.5">Venue</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isEvent = item.itemKind === "EVENT";
                  const isActivity = item.itemKind === "ACTIVITY";
                  const isRegistered = isActivity && registeredActivityIds.has(item.id);
                  const title = isEvent ? item.title : item.name;
                  const venue = isEvent ? item.venue : item.location;

                  return (
                    <tr
                      key={`${item.itemKind}-${item.id}`}
                      onClick={() => {
                        if (isEvent) {
                          onSelectEvent(item);
                        } else {
                          onSelectActivity(item);
                        }
                      }}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Category Badge */}
                      <td className="px-5 py-4 align-top whitespace-nowrap">
                        {isEvent ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Layers className="w-3.5 h-3.5" />
                            Event
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border ${getActivityTypeBadgeStyle(item.type || item.activityType)}`}>
                            <Trophy className="w-3.5 h-3.5" />
                            {getActivityTypeLabel(item.type || item.activityType)}
                          </span>
                        )}
                      </td>

                      {/* Title & Description */}
                      <td className="px-4 py-4 align-top max-w-[280px]">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isEvent) onSelectEvent(item);
                              else onSelectActivity(item);
                            }}
                            className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-left truncate block max-w-[280px]"
                            title={title}
                          >
                            {title}
                          </button>
                          {item.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                          {isActivity && (
                            <span className="inline-block text-[10px] font-medium text-slate-400">
                              {item.registrationType} participation
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="px-4 py-4 align-top text-xs text-slate-600 whitespace-nowrap">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                          <span className="font-medium">
                            {formatDateRange(item.startDateTime, item.endDateTime)}
                          </span>
                        </div>
                      </td>

                      {/* Venue */}
                      <td className="px-4 py-4 align-top text-xs text-slate-600 max-w-[160px]">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span className="truncate">{venue || "Campus / Not set"}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 align-top whitespace-nowrap">
                        {isRegistered ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Registered
                          </span>
                        ) : isActivity ? (
                          isRegistrationOpen(item) ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              Registration Open
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                              {isEnded(item) ? "Ended" : "Registration Closed"}
                            </span>
                          )
                        ) : (
                          isEnded(item) ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                              Event Ended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              Explore Activities
                            </span>
                          )
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {/* View Details Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isEvent) onSelectEvent(item);
                              else onSelectActivity(item);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          {/* Fast Register Button for Activities (only if open and not registered) */}
                          {isActivity && !isRegistered && isRegistrationOpen(item) && (
                            <button
                              type="button"
                              onClick={() => onRegisterActivity(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Register</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Info Summary */}
          <div className="px-5 py-3.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2 bg-slate-50/40">
            <span>
              Showing {filteredItems.length} of {allItems.length} total items
            </span>
            <span className="text-slate-400">
              {totalEventsCount} {totalEventsCount === 1 ? "event" : "events"} · {totalActivitiesCount} {totalActivitiesCount === 1 ? "competition" : "competitions"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
