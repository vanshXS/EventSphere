import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  MapPin,
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatDateRange, getVisibilityLabel } from "../../events/utils/eventHelpers";
import {
  getActivityTypeLabel,
  isRegistrationOpen,
  isEnded
} from "../../activities/utils/activityHelpers";
import { getActivityRegistration, isActiveRegistration } from "../utils/registrationHelpers";
import RegistrationStatusBadge from "./RegistrationStatusBadge";

const dateOptions = [
  { value: "ANY", label: "Any date" },
  { value: "WEEK", label: "Next 7 days" },
  { value: "MONTH", label: "Next 30 days" },
  { value: "PAST", label: "Past events" }
];

const sortOptions = [
  { value: "UPCOMING", label: "Upcoming first" },
  { value: "NEWEST", label: "Recently added" }
];

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function activityAccent(type) {
  if (type === "WORKSHOP") return "border-t-amber-500";
  if (type === "HACKATHON" || type === "TECHNICAL_COMPETITION") return "border-t-emerald-500";
  return "border-t-indigo-500";
}

function activityLabel(item) {
  if (item.itemKind === "EVENT") return "Event";
  return getActivityTypeLabel(item.type || item.activityType);
}

function getItemTitle(item) {
  return item.itemKind === "EVENT" ? item.title : item.name;
}

function getItemLocation(item) {
  return item.itemKind === "EVENT" ? item.venue : item.location;
}

function isCompetition(item) {
  if (item.itemKind !== "ACTIVITY") return false;
  const type = item.type || item.activityType;
  return type === "HACKATHON" || type === "TECHNICAL_COMPETITION";
}

export default function ParticipantEventTable({
  events = [],
  standaloneActivities = [],
  myRegistrations = [],
  onSelectEvent,
  onSelectActivity,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ANY");
  const [sortOrder, setSortOrder] = useState("UPCOMING");
  const [currentPage, setCurrentPage] = useState(0);

  const allItems = useMemo(() => {
    const eventItems = events.map((event) => ({ ...event, itemKind: "EVENT" }));
    const activityItems = standaloneActivities.map((activity) => ({ ...activity, itemKind: "ACTIVITY" }));
    return [...eventItems, ...activityItems];
  }, [events, standaloneActivities]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const today = startOfToday();
    const weekLimit = today + 7 * 24 * 60 * 60 * 1000;
    const monthLimit = today + 30 * 24 * 60 * 60 * 1000;

    const result = allItems.filter((item) => {
      if (typeFilter === "EVENTS" && item.itemKind !== "EVENT") return false;
      if (typeFilter === "COMPETITIONS" && !isCompetition(item)) return false;

      const start = Date.parse(item.startDateTime || "") || 0;
      if (dateFilter === "WEEK" && (start < today || start > weekLimit)) return false;
      if (dateFilter === "MONTH" && (start < today || start > monthLimit)) return false;
      if (dateFilter === "PAST" && (!start || start >= today)) return false;

      if (!query) return true;
      return [
        item.title,
        item.name,
        item.description,
        getItemLocation(item),
        activityLabel(item)
      ].some((value) => String(value || "").toLowerCase().includes(query));
    });

    result.sort((a, b) => {
      if (sortOrder === "NEWEST") {
        return (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0);
      }
      const aTime = Date.parse(a.startDateTime || "") || 0;
      const bTime = Date.parse(b.startDateTime || "") || 0;
      const aUpcoming = aTime >= today;
      const bUpcoming = bTime >= today;
      if (aUpcoming && bUpcoming) return aTime - bTime;
      if (aUpcoming) return -1;
      if (bUpcoming) return 1;
      return bTime - aTime;
    });
    return result;
  }, [allItems, typeFilter, dateFilter, sortOrder, searchQuery]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = filteredItems.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, typeFilter, dateFilter, sortOrder]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages - 1));
  }, [totalPages]);

  const filterOptions = [
    { value: "ALL", label: "All", count: allItems.length },
    { value: "EVENTS", label: "Events", count: events.length },
    { value: "COMPETITIONS", label: "Competitions", count: standaloneActivities.filter(isCompetition).length }
  ];

  const openDetails = (item) => {
    if (item.itemKind === "EVENT") onSelectEvent?.(item);
    else onSelectActivity?.(item);
  };

  const renderItem = (item) => {
    const title = getItemTitle(item) || "Untitled";
    const location = getItemLocation(item);
    const activityType = item.type || item.activityType;
    const registration = item.itemKind === "ACTIVITY"
      ? getActivityRegistration(myRegistrations, item.id)
      : myRegistrations.find((entry) => !entry.activityId && entry.eventId === item.id && isActiveRegistration(entry));

    const ended = item.itemKind === "ACTIVITY"
      ? isEnded(item)
      : Boolean(item.endDateTime && Date.parse(item.endDateTime) <= Date.now()) || ["COMPLETED", "CANCELLED"].includes(item.status || item.eventStatus);

    const open = item.itemKind === "ACTIVITY" ? isRegistrationOpen(item) : !ended;
    const accent = item.itemKind === "EVENT" ? "border-t-indigo-600" : activityAccent(activityType);
    const categoryColor = item.itemKind === "EVENT"
      ? "text-indigo-600"
      : activityType === "WORKSHOP"
        ? "text-amber-600"
        : activityType === "HACKATHON" || activityType === "TECHNICAL_COMPETITION"
          ? "text-emerald-600"
          : "text-indigo-600";

    const footerContext = item.itemKind === "EVENT"
      ? getVisibilityLabel(item.visibility)
      : item.registrationType === "TEAM"
        ? "Team registration"
        : item.registrationType === "BOTH"
          ? "Individual / Team"
          : "Individual registration";

    return (
      <article
        key={`${item.itemKind}-${item.id}`}
        className={`group flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 border-t-[3px] bg-white transition-colors duration-150 hover:border-slate-300 ${accent}`}
      >
        <div className="flex flex-1 flex-col justify-between p-6 max-md:p-5">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${categoryColor}`}>
                {activityLabel(item)}
              </span>
              {registration ? (
                <RegistrationStatusBadge status={registration.status} />
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded border border-slate-100 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                  <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {open ? "Open" : ended ? "Ended" : "Closed"}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => openDetails(item)}
              className="mb-2 block w-full truncate text-left text-lg font-semibold leading-snug tracking-tight text-slate-900 transition-colors hover:text-indigo-600 max-md:text-base"
            >
              {title}
            </button>

            {item.description && (
              <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            )}

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{formatDateRange(item.startDateTime, item.endDateTime)}</span>
              </div>
              {location && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{location}</span>
                </div>
              )}
              {registration && (
                <div className="pt-1 text-xs text-slate-500">
                  {item.itemKind === "ACTIVITY" && registration.registrationType === "TEAM"
                    ? `Team entry · ${registration.teamName || "Your team"}`
                    : "You are registered"}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="max-w-[60%] truncate text-xs text-slate-500">{footerContext}</span>
            <button
              type="button"
              onClick={() => openDetails(item)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800"
            >
              View details
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-3 max-md:mb-1" aria-label="Search and filters">
        <div className="relative w-full max-w-md flex-1 max-md:max-w-none">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search by event, competition or location"
            placeholder="Search by event, competition or location"
            className="h-[42px] w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-none outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <label className="relative">
          <span className="sr-only">Date filter</span>
          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="h-[42px] min-w-[112px] appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3.5 pr-9 text-sm text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          >
            {dateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </label>

        <label className="relative">
          <span className="sr-only">Sort events</span>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="h-[42px] min-w-[140px] appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3.5 pr-9 text-sm text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          >
            {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </label>
      </section>

      <section aria-label="Browse categories" className="flex flex-col gap-2.5">
        <p className="hidden text-xs font-semibold uppercase tracking-wider text-slate-500 md:block">Browse</p>
        <div className="flex flex-wrap items-center justify-between gap-3 max-md:block">
          <div className="flex flex-wrap items-center gap-2 max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-1">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(option.value)}
                aria-pressed={typeFilter === option.value}
                className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
                  typeFilter === option.value
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {option.label} · {option.count}
              </button>
            ))}
          </div>
          <span className="text-sm font-medium text-slate-500 max-md:mt-3 max-md:block max-md:text-xs">
            {filteredItems.length} {typeFilter === "EVENTS" ? "events" : typeFilter === "COMPETITIONS" ? "competitions" : "results"}
          </span>
        </div>
      </section>

      {filteredItems.length ? (
        <>
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 max-md:gap-4" aria-label="Event results">
            {visibleItems.map(renderItem)}
          </section>
          {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-4 text-xs text-slate-500" aria-label="Event result pages">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
              disabled={currentPage === 0}
              aria-label="Previous page"
              className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="font-medium tabular-nums">{currentPage + 1} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))}
              disabled={currentPage >= totalPages - 1}
              aria-label="Next page"
              className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <h2 className="text-base font-semibold text-slate-800">No matching events or activities</h2>
          <p className="mt-1 text-sm text-slate-500">Try another search or change the filters.</p>
          <button
            type="button"
            onClick={() => { setSearchQuery(""); setTypeFilter("ALL"); setDateFilter("ANY"); setSortOrder("UPCOMING"); }}
            className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
