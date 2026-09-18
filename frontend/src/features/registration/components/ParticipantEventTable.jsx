import { useMemo, useState } from "react";
import { Search, Calendar, MapPin } from "lucide-react";

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
    ["ACTIVITIES", "Activities", standaloneActivities.length],
    [
      "ACTIVE",
      "My active entries",
      allItems.filter(hasActiveEntry).length
    ]
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                typeFilter === value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search events and activities"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search events or activities"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">
            No matching events or activities
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Try another search or filter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  {[
                    "Category",
                    "Title",
                    "Schedule",
                    "Venue",
                    "Registration",
                    "Actions"
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isEvent = item.itemKind === "EVENT";
                  const type = item.type || item.activityType;

                  const registration = isEvent
                    ? null
                    : getActivityRegistration(
                        myRegistrations,
                        item.id
                      );

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
                      className="align-top hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                            isEvent
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                              : getActivityTypeBadgeStyle(type)
                          }`}
                        >
                          {isEvent
                            ? "Event"
                            : getActivityTypeLabel(type)}
                        </span>
                      </td>

                      <td className="max-w-xs space-y-2 px-4 py-4">
                        <button
                          type="button"
                          onClick={showDetails}
                          className="text-left text-sm font-semibold text-slate-900 hover:text-indigo-700"
                        >
                          {isEvent ? item.title : item.name}
                        </button>

                        {item.description && (
                          <p className="line-clamp-2 leading-relaxed text-slate-500">
                            {item.description}
                          </p>
                        )}

                        <p className="text-[11px] text-slate-400">
                          {isEvent
                            ? getVisibilityLabel(item.visibility)
                            : `${item.registrationType} participation`}
                        </p>
                      </td>

                      <td className="max-w-xs px-4 py-4 text-slate-600">
                        <div className="flex items-start gap-2">
                          <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                          <span>
                            {formatDateRange(
                              item.startDateTime,
                              item.endDateTime
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="max-w-[180px] px-4 py-4 text-slate-600">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>
                            {(isEvent ? item.venue : item.location) ||
                              "Venue not set"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {registration ? (
                          <RegistrationStatusBadge
                            status={registration.status}
                          />
                        ) : (
                          <span className="text-slate-500">
                            {isEvent
                              ? isEnded(item)
                                ? "Event ended"
                                : "Explore activities"
                              : isRegistrationOpen(item)
                              ? "Registration open"
                              : isEnded(item)
                              ? "Ended"
                              : "Registration closed"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={showDetails}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Details
                          </button>

                          {!isEvent &&
                            !registration &&
                            isRegistrationOpen(item) && (
                              <button
                                type="button"
                                onClick={() =>
                                  onRegisterActivity?.(item)
                                }
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700"
                              >
                                Register
                              </button>
                            )}

                          {(registration ||
                            (isEvent && activeEventIds.has(item.id))) &&
                            onViewMyRegistrations && (
                              <button
                                type="button"
                                onClick={onViewMyRegistrations}
                                className="rounded-lg px-3 py-1.5 font-semibold text-indigo-600 hover:bg-indigo-50"
                              >
                                My Registrations
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

          <p className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
            Showing {filteredItems.length} of {allItems.length} items
          </p>
        </div>
      )}
    </div>
  );
}