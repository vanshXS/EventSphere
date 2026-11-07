import { useMemo, useState } from "react";
import {
  Search,
  Calendar,
  MapPin,
  ChevronRight,
  Sparkles,
  LayoutList,
  LayoutGrid,
  BookmarkCheck,
  Clock,
  Users,
  User,
  X
} from "lucide-react";

import {
  formatDateRange,
  getVisibilityLabel
} from "../../events/utils/eventHelpers";

import {
  getActivityTypeLabel,
  getActivityTypeBadgeStyle,
  isRegistrationOpen,
  isEnded
} from "../../activities/utils/activityHelpers";

import {
  getActivityRegistration,
  isActiveRegistration
} from "../utils/registrationHelpers";

import RegistrationStatusBadge from "./RegistrationStatusBadge";

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
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("TABLE"); // "TABLE" | "CARDS"

  const allItems = useMemo(() => {
    const eventItems = events.map((event) => ({
      ...event,
      itemKind: "EVENT"
    }));

    const activityItems = standaloneActivities.map((activity) => ({
      ...activity,
      itemKind: "ACTIVITY"
    }));

    return [...eventItems, ...activityItems].sort((a, b) => {
      const timeA = Date.parse(a.createdAt || a.startDateTime || 0);
      const timeB = Date.parse(b.createdAt || b.startDateTime || 0);
      return timeB - timeA;
    });
  }, [events, standaloneActivities]);

  const activeActivityIds = useMemo(() => {
    return new Set(
      myRegistrations
        .filter(isActiveRegistration)
        .map((registration) => registration.activityId)
    );
  }, [myRegistrations]);

  const activeEventIds = useMemo(() => {
    return new Set(
      myRegistrations
        .filter(isActiveRegistration)
        .map((registration) => registration.eventId)
        .filter(Boolean)
    );
  }, [myRegistrations]);

  const hasActiveEntry = (item) =>
    item.itemKind === "EVENT"
      ? activeEventIds.has(item.id)
      : activeActivityIds.has(item.id);

  const filteredItems = allItems.filter((item) => {
    if (typeFilter === "EVENTS" && item.itemKind !== "EVENT") {
      return false;
    }

    if (typeFilter === "ACTIVITIES" && item.itemKind !== "ACTIVITY") {
      return false;
    }

    if (typeFilter === "ACTIVE" && !hasActiveEntry(item)) {
      return false;
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      item.title,
      item.name,
      item.description,
      item.venue,
      item.location,
      item.itemKind === "ACTIVITY"
        ? getActivityTypeLabel(item.type || item.activityType)
        : "event"
    ].some((value) => (value || "").toLowerCase().includes(query));
  });

  const filterOptions = [
    ["ALL", "All", allItems.length],
    ["EVENTS", "Events", events.length],
    ["ACTIVITIES", "Competitions", standaloneActivities.length],
    ["ACTIVE", "My Entries", allItems.filter(hasActiveEntry).length]
  ];

  return (
    <div className="space-y-5">
      {/* Filter, Search & View Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {filterOptions.map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  typeFilter === value
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                {label}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                    typeFilter === value
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === "TABLE"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Table view"
            >
              <LayoutList className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("CARDS")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === "CARDS"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Card view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search events and activities"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search events, competitions or locations..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Results Content */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 shadow-xs">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="font-semibold text-slate-700">No matching events or competitions</p>
          <p className="mt-1 text-xs text-slate-400">
            Try a different search query or filter.
          </p>
        </div>
      ) : (
        <>
          {/* Table View */}
          {viewMode === "TABLE" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3.5">
                        Event / Competition
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Category
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Schedule
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Venue
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Participation
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => {
                      const isEvent = item.itemKind === "EVENT";
                      const type = item.type || item.activityType;
                      const title = isEvent ? item.title : item.name;
                      const venue = isEvent ? item.venue : item.location;

                      const registration = isEvent
                        ? null
                        : getActivityRegistration(myRegistrations, item.id);

                      const isRegistered = Boolean(
                        registration || (isEvent && activeEventIds.has(item.id))
                      );

                      const canRegister =
                        !isEvent &&
                        !registration &&
                        isRegistrationOpen(item);

                      const ended = isEnded(item);

                      const showDetails = () => {
                        if (isEvent) {
                          onSelectEvent?.(item);
                        } else {
                          onSelectActivity?.(item);
                        }
                      };

                      return (
                        <tr
                          key={`${item.itemKind}-${item.id}`}
                          className="transition-colors hover:bg-slate-50/60"
                        >
                          {/* Title & Description */}
                          <td className="px-4 py-4 max-w-xs space-y-1">
                            <button
                              type="button"
                              onClick={showDetails}
                              className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left leading-snug cursor-pointer block"
                            >
                              {title}
                            </button>

                            {item.description && (
                              <p className="text-xs text-slate-500 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </td>

                          {/* Category Badge */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                                isEvent
                                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                  : getActivityTypeBadgeStyle(type)
                              }`}
                            >
                              {isEvent ? "Event" : getActivityTypeLabel(type)}
                            </span>
                          </td>

                          {/* Schedule */}
                          <td className="px-4 py-4 text-xs text-slate-600 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <span className="font-medium">
                                {formatDateRange(item.startDateTime, item.endDateTime)}
                              </span>
                            </div>
                          </td>

                          {/* Venue */}
                          <td className="px-4 py-4 text-xs text-slate-500 max-w-[150px] truncate">
                            {venue ? (
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{venue}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Participation Type */}
                          <td className="px-4 py-4 text-xs text-slate-600 whitespace-nowrap">
                            {isEvent ? (
                              <span className="text-slate-500">
                                {getVisibilityLabel(item.visibility)}
                              </span>
                            ) : item.registrationType === "TEAM" ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                                <Users className="h-3 w-3" />
                                Team
                              </span>
                            ) : item.registrationType === "BOTH" ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                Individual / Team
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                <User className="h-3 w-3" />
                                Individual
                              </span>
                            )}
                          </td>

                          {/* Status & Actions */}
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Registration state badge if active */}
                              {registration && (
                                <RegistrationStatusBadge status={registration.status} />
                              )}

                              {ended && !registration && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                  <Clock className="h-3 w-3" />
                                  Ended
                                </span>
                              )}

                              {/* Details Button */}
                              <button
                                type="button"
                                onClick={showDetails}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                              >
                                Details
                                <ChevronRight className="h-3 w-3 text-slate-400" />
                              </button>

                              {/* Register Button */}
                              {canRegister && (
                                <button
                                  type="button"
                                  onClick={() => onRegisterActivity?.(item)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  Register
                                </button>
                              )}

                              {/* View Registration */}
                              {isRegistered && onViewMyRegistrations && (
                                <button
                                  type="button"
                                  onClick={onViewMyRegistrations}
                                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                                >
                                  <BookmarkCheck className="h-3.5 w-3.5" />
                                  My Entry
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

              <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
                Showing {filteredItems.length} of {allItems.length} items
              </div>
            </div>
          )}

          {/* Card Grid View */}
          {viewMode === "CARDS" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const isEvent = item.itemKind === "EVENT";
                const type = item.type || item.activityType;
                const title = isEvent ? item.title : item.name;
                const venue = isEvent ? item.venue : item.location;

                const registration = isEvent
                  ? null
                  : getActivityRegistration(myRegistrations, item.id);

                const showDetails = () => {
                  if (isEvent) {
                    onSelectEvent?.(item);
                  } else {
                    onSelectActivity?.(item);
                  }
                };

                const canRegister =
                  !isEvent &&
                  !registration &&
                  isRegistrationOpen(item);

                const ended = isEnded(item);

                return (
                  <div
                    key={`${item.itemKind}-${item.id}`}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
                  >
                    <div className="space-y-3">
                      {/* Card Header – Type Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                            isEvent
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                              : getActivityTypeBadgeStyle(type)
                          }`}
                        >
                          {isEvent ? "Event" : getActivityTypeLabel(type)}
                        </span>

                        {registration && (
                          <RegistrationStatusBadge status={registration.status} />
                        )}

                        {ended && !registration && (
                          <span className="inline-flex text-[11px] font-medium text-slate-400">
                            Ended
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <button
                          type="button"
                          onClick={showDetails}
                          className="text-left text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors leading-snug cursor-pointer block"
                        >
                          {title}
                        </button>

                        {item.description && (
                          <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Meta info */}
                      <div className="space-y-2 rounded-xl bg-slate-50/80 p-3 text-xs text-slate-600 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                          <span className="truncate">
                            {formatDateRange(item.startDateTime, item.endDateTime)}
                          </span>
                        </div>

                        {venue && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{venue}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer – Actions */}
                    <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={showDetails}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                      >
                        Details
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      {canRegister && (
                        <button
                          type="button"
                          onClick={() => onRegisterActivity?.(item)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Register
                        </button>
                      )}

                      {(registration || (isEvent && activeEventIds.has(item.id))) &&
                        onViewMyRegistrations && (
                          <button
                            type="button"
                            onClick={onViewMyRegistrations}
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            My Entry
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Count Footer */}
          <p className="text-center text-xs text-slate-400 pt-1">
            Showing {filteredItems.length} of {allItems.length} available items
          </p>
        </>
      )}
    </div>
  );
}
