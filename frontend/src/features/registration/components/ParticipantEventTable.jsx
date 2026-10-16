import { useMemo, useState } from "react";
import { Search, Calendar, MapPin, ChevronRight, Sparkles } from "lucide-react";

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

  const activeActivityIds = new Set(
    myRegistrations
      .filter(isActiveRegistration)
      .map((registration) => registration.activityId)
  );

  const activeEventIds = new Set(
    myRegistrations
      .filter(isActiveRegistration)
      .map((registration) => registration.eventId)
      .filter(Boolean)
  );

  const hasActiveEntry = (item) =>
    item.itemKind === "EVENT"
      ? activeEventIds.has(item.id)
      : activeActivityIds.has(item.id);

  const filteredItems = allItems.filter((item) => {
    if (typeFilter === "EVENTS" && item.itemKind !== "EVENT") {
      return false;
    }

    if (
      typeFilter === "ACTIVITIES" &&
      item.itemKind !== "ACTIVITY"
    ) {
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
    [
      "ACTIVE",
      "My Entries",
      allItems.filter(hasActiveEntry).length
    ]
  ];

  return (
    <div className="space-y-5">
      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {filterOptions.map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                typeFilter === value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {label}
              <span className={`ml-1.5 ${typeFilter === value ? "text-indigo-200" : "text-slate-400"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Search box */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search events and activities"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search events or activities..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Results */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h3 className="text-base font-semibold text-slate-800">
            No matching events or activities
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Try a different search term or filter.
          </p>
        </div>
      ) : (
        <>
          {/* Card Grid */}
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
                  className="group relative flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden"
                >
                  {/* Card Header – Type Badge */}
                  <div className="px-5 pt-4 pb-0 flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
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

                  {/* Card Body */}
                  <div className="px-5 pt-3 pb-4 flex-1 flex flex-col">
                    {/* Title */}
                    <button
                      type="button"
                      onClick={showDetails}
                      className="text-left text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors leading-snug cursor-pointer"
                    >
                      {title}
                    </button>

                    {/* Description */}
                    {item.description && (
                      <p className="mt-1.5 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="mt-3 flex flex-col gap-1.5 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                        <span className="truncate">
                          {formatDateRange(item.startDateTime, item.endDateTime)}
                        </span>
                      </div>
                      {venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{venue}</span>
                        </div>
                      )}
                    </div>

                    {/* Visibility / Participation type */}
                    <p className="mt-2 text-xs text-slate-400">
                      {isEvent
                        ? getVisibilityLabel(item.visibility)
                        : `${item.registrationType || "Open"} participation`}
                    </p>
                  </div>

                  {/* Card Footer – Actions */}
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={showDetails}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Details
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {canRegister && (
                      <button
                        type="button"
                        onClick={() => onRegisterActivity?.(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Register
                      </button>
                    )}

                    {(registration ||
                      (isEvent && activeEventIds.has(item.id))) &&
                      onViewMyRegistrations && (
                        <button
                          type="button"
                          onClick={onViewMyRegistrations}
                          className="rounded-lg px-3.5 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        >
                          View Registration
                        </button>
                      )}

                    {!canRegister && !registration && !ended && isEvent && (
                      <span className="text-sm text-slate-400 ml-auto">
                        Explore activities →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer count */}
          <p className="text-center text-sm text-slate-400 pt-2">
            Showing {filteredItems.length} of {allItems.length} items
          </p>
        </>
      )}
    </div>
  );
}