import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Loader2,
  Search,
  XCircle,
  Ticket,
  X,
  ExternalLink,
  AlertCircle,
  Trophy,
  LayoutList,
  LayoutGrid,
  CheckCircle2,
  Clock,
  Ban,
  Users,
  User,
  Sparkles
} from "lucide-react";

import { useAuth } from "../../auth/AuthContext";

import {
  formatDateTime,
  formatDateRange
} from "../../events/utils/eventHelpers";

import {
  getActivityTypeLabel,
  getActivityTypeBadgeStyle,
  isEnded
} from "../../activities/utils/activityHelpers";

import {
  isActiveRegistration,
  normalizeRegistrationStatus
} from "../utils/registrationHelpers";

import RegistrationStatusBadge from "./RegistrationStatusBadge";
import ConfirmDialog from "../../events/components/ConfirmDialog";
import QrTicketCard from "./QrTicketCard";
import {
  getActivityTicket,
  getEventTicket
} from "../../attendance/attendanceApi";

const filters = [
  ["ALL", "All"],
  ["ACTIVE", "Active"],
  ["PENDING", "Pending"],
  ["APPROVED", "Approved"],
  ["REJECTED", "Rejected"],
  ["CANCELLED", "Cancelled"]
];

function matchesStatus(registration, filter) {
  if (filter === "ALL") return true;
  if (filter === "ACTIVE") return isActiveRegistration(registration);

  return normalizeRegistrationStatus(registration.status) === filter;
}

export default function MyRegistrationsTable({
  registrations = [],
  events = [],
  standaloneActivities = [],
  myTeams = [],
  cancellingId,
  onCancelRegistration,
  onBrowseEvents,
  onViewResults,
  currentUser
}) {
  const { user: authUser } = useAuth();
  const user = currentUser || authUser;
  const currentUserId = user?.userId || user?.id;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("TABLE"); // "TABLE" | "CARDS"
  const [regToCancel, setRegToCancel] = useState(null);
  const [cancelError, setCancelError] = useState("");

  const [ticketModalReg, setTicketModalReg] = useState(null);
  const [modalTicket, setModalTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState("");

  const handleOpenTicketModal = async (registration) => {
    setTicketModalReg(registration);
    setTicketError("");

    if (registration.ticket?.qrPayload) {
      setModalTicket(registration.ticket);
      return;
    }

    try {
      setTicketLoading(true);
      const loader = registration.activityId ? getActivityTicket : getEventTicket;
      const loadedTicket = await loader(registration.id);
      setModalTicket(loadedTicket);
    } catch (err) {
      setTicketError(
        err.response?.data?.message || "Could not load the QR ticket for this registration."
      );
    } finally {
      setTicketLoading(false);
    }
  };

  const handleCloseTicketModal = () => {
    setTicketModalReg(null);
    setModalTicket(null);
    setTicketError("");
  };

  const enrichedRegistrations = useMemo(() => {
    const activitiesMap = new Map(
      standaloneActivities.map((activity) => [activity.id, activity])
    );

    const eventsMap = new Map(
      events.map((event) => [event.id, event])
    );

    const teamsMap = new Map(
      myTeams.map((team) => [team.id, team])
    );

    return registrations.map((registration) => {
      const activity = activitiesMap.get(registration.activityId);
      const event = eventsMap.get(registration.eventId);
      const team = teamsMap.get(registration.teamId);

      // Determine accurate lifecycle states
      const activityEnded = isEnded(activity);
      const eventEnded =
        event &&
        (event.eventStatus === "COMPLETED" ||
          (event.endDateTime &&
            new Date(event.endDateTime).getTime() <= Date.now()));
      const registrationEnded =
        registration.endDateTime &&
        new Date(registration.endDateTime).getTime() <= Date.now();

      const ended = Boolean(activityEnded || eventEnded || registrationEnded);

      const isActivityCancelled =
        activity?.status === "CANCELLED" || event?.eventStatus === "CANCELLED";
      const isRegCancelled =
        registration.status === "CANCELLED" ||
        normalizeRegistrationStatus(registration.status) === "CANCELLED";
      const isRegRejected =
        registration.status === "REJECTED" ||
        normalizeRegistrationStatus(registration.status) === "REJECTED";

      const isCompetition =
        activity?.type === "HACKATHON" ||
        activity?.type === "TECHNICAL_COMPETITION" ||
        activity?.activityType === "HACKATHON" ||
        activity?.activityType === "TECHNICAL_COMPETITION" ||
        Boolean(registration.activityId);

      return {
        ...registration,
        activity,
        event,
        isEnded: ended,
        isEventCancelled: isActivityCancelled,
        isCancelled: isRegCancelled,
        isRejected: isRegRejected,
        isCompetition,
        activityName:
          registration.activityName ||
          activity?.name ||
          "Activity registration",
        activityType:
          registration.activityType ||
          activity?.activityType ||
          activity?.type ||
          "OTHER",
        eventName: registration.eventName || event?.title || null,
        teamName: registration.teamName || team?.name || null,
        teamMemberIds: registration.teamMemberIds || null,
        teamLeaderId: registration.teamLeaderId || null,
        startDateTime:
          registration.startDateTime || activity?.startDateTime,
        endDateTime:
          registration.endDateTime || activity?.endDateTime,
        location:
          registration.location || activity?.location || event?.venue
      };
    });
  }, [registrations, standaloneActivities, events, myTeams]);

  // Robust permission checks
  const canCancelRegistration = (registration) => {
    if (!registration) return false;
    if (registration.isCancelled || registration.isRejected) return false;
    if (registration.isEnded) return false;
    if (registration.isEventCancelled) return false;

    // Must be in active state (PENDING or APPROVED)
    if (!isActiveRegistration(registration)) return false;

    // Team check: only leader can cancel team entry
    if (registration.registrationType === "TEAM") {
      if (!currentUserId) return false;
      if (registration.teamLeaderId) {
        return registration.teamLeaderId === currentUserId;
      }
      return registration.participantId === currentUserId;
    }

    return true;
  };

  const canViewTicket = (registration) => {
    if (!registration) return false;
    if (registration.isCancelled || registration.isRejected) return false;
    if (registration.isEventCancelled) return false;

    // Ticket is valid only when approved / registered
    const status = normalizeRegistrationStatus(registration.status);
    return status === "APPROVED" || registration.status === "REGISTERED";
  };

  const filteredRegistrations = enrichedRegistrations.filter(
    (registration) => {
      if (!matchesStatus(registration, statusFilter)) return false;

      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      return [
        registration.activityName,
        registration.eventName,
        registration.teamName,
        registration.location
      ].some((value) => (value || "").toLowerCase().includes(query));
    }
  );

  const activeCount = enrichedRegistrations.filter(
    isActiveRegistration
  ).length;

  const confirmCancellation = async () => {
    if (!regToCancel || cancellingId) return;

    setCancelError("");

    try {
      const result = await onCancelRegistration(regToCancel);

      if (result && result.success !== false && result !== false) {
        setRegToCancel(null);
      } else {
        setCancelError(
          result?.message ||
          "Cancellation was not confirmed. Close this dialog and refresh your registrations before trying again."
        );
      }
    } catch (err) {
      setCancelError(
        err.response?.data?.message ||
        "Could not cancel this registration. Close this dialog and try again."
      );
    }
  };

  if (registrations.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Calendar className="h-7 w-7" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">
            No registrations yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Explore activities and register individually or with your team to start
            participating in events.
          </p>
        </div>

        {onBrowseEvents && (
          <button
            type="button"
            onClick={onBrowseEvents}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            Explore Competitions & Events
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Filter and Control Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {filters.map(([value, label]) => {
                const count = enrichedRegistrations.filter(
                  (registration) => matchesStatus(registration, value)
                ).length;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === value
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                    }`}
                  >
                    {label}
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                        statusFilter === value
                          ? "bg-indigo-500 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
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

          {/* Search Box */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search my registrations"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by activity, event, team or location..."
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

        {/* Empty Search Results */}
        {filteredRegistrations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 shadow-xs">
            <Search className="mx-auto mb-2 h-6 w-6 text-slate-300" />
            <p className="font-semibold text-slate-700">No matching registrations found</p>
            <p className="mt-1 text-xs text-slate-400">
              Try adjusting your search query or selecting a different status filter.
            </p>
          </div>
        ) : (
          <>
            {/* Table View */}
            {viewMode === "TABLE" && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3.5">
                          Activity / Event
                        </th>
                        <th scope="col" className="px-4 py-3.5">
                          Entry Type
                        </th>
                        <th scope="col" className="px-4 py-3.5">
                          Schedule & Venue
                        </th>
                        <th scope="col" className="px-4 py-3.5">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3.5 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredRegistrations.map((registration) => {
                        const canCancel = canCancelRegistration(registration);
                        const hasTicket = canViewTicket(registration);

                        return (
                          <tr
                            key={registration.id}
                            className="transition-colors hover:bg-slate-50/60"
                          >
                            {/* Activity / Event */}
                            <td className="px-4 py-4 max-w-xs space-y-1.5">
                              <span
                                className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getActivityTypeBadgeStyle(
                                  registration.activityType
                                )}`}
                              >
                                {getActivityTypeLabel(registration.activityType)}
                              </span>

                              <p className="font-bold text-slate-900 leading-snug">
                                {registration.activityName}
                              </p>

                              {registration.eventName && (
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                  <span>Event:</span>
                                  <span className="font-medium text-slate-600">
                                    {registration.eventName}
                                  </span>
                                </p>
                              )}
                            </td>

                            {/* Entry Type */}
                            <td className="px-4 py-4 text-slate-700">
                              {registration.registrationType === "TEAM" ? (
                                <div className="space-y-1">
                                  <div className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs font-semibold text-purple-700">
                                    <Users className="h-3 w-3" />
                                    {registration.teamName || "Team"}
                                  </div>

                                  {registration.teamMemberIds && (
                                    <p className="text-xs text-slate-400">
                                      {registration.teamMemberIds.length} members
                                    </p>
                                  )}

                                  {registration.teamLeaderId && (
                                    <p className="text-[11px] text-slate-500 font-medium">
                                      {registration.teamLeaderId === currentUserId
                                        ? "Team Leader"
                                        : "Team Member"}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  <User className="h-3 w-3" />
                                  Individual
                                </span>
                              )}
                            </td>

                            {/* Schedule & Venue */}
                            <td className="px-4 py-4 text-xs text-slate-600 max-w-xs space-y-1">
                              {registration.startDateTime && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                                  <span className="font-medium">
                                    {formatDateRange(
                                      registration.startDateTime,
                                      registration.endDateTime
                                    )}
                                  </span>
                                </div>
                              )}

                              {registration.location && (
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                  <span>{registration.location}</span>
                                </div>
                              )}
                            </td>

                            {/* Status & Lifecycle Notes */}
                            <td className="px-4 py-4 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <RegistrationStatusBadge status={registration.status} />

                                {registration.isEnded && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                    <Clock className="h-3 w-3" />
                                    Ended
                                  </span>
                                )}

                                {registration.isEventCancelled && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                    <Ban className="h-3 w-3" />
                                    Event Cancelled
                                  </span>
                                )}
                              </div>

                              {registration.reviewNote && (
                                <p className="max-w-xs rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs text-slate-600">
                                  <span className="font-semibold text-slate-700">Note: </span>
                                  {registration.reviewNote}
                                </p>
                              )}
                            </td>

                            {/* Actions Column */}
                            <td className="px-4 py-4 text-right">
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                {/* View Ticket button (only if active, approved, not cancelled) */}
                                {hasTicket && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTicketModal(registration)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-100 hover:border-indigo-300 transition-colors cursor-pointer"
                                    title="View QR Entry Ticket"
                                  >
                                    <Ticket className="h-3.5 w-3.5" />
                                    Ticket
                                  </button>
                                )}

                                {/* Results button (takes participant directly to Results tab for this activity) */}
                                {onViewResults && registration.activityId && (
                                  <button
                                    type="button"
                                    onClick={() => onViewResults(registration.activityId)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-xs hover:bg-amber-100 hover:border-amber-300 transition-colors cursor-pointer"
                                    title="View Competition Results"
                                  >
                                    <Trophy className="h-3.5 w-3.5 text-amber-600" />
                                    Results
                                  </button>
                                )}

                                {/* Cancel Registration button */}
                                {canCancel ? (
                                  <button
                                    type="button"
                                    disabled={Boolean(cancellingId)}
                                    onClick={() => {
                                      setCancelError("");
                                      setRegToCancel(registration);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors cursor-pointer"
                                  >
                                    {cancellingId === registration.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5" />
                                    )}
                                    Cancel
                                  </button>
                                ) : !registration.isCancelled &&
                                  !registration.isEnded &&
                                  registration.registrationType === "TEAM" &&
                                  registration.teamLeaderId !== currentUserId ? (
                                  <span
                                    className="inline-flex items-center text-[11px] text-slate-400"
                                    title="Only the team leader can cancel this team registration"
                                  >
                                    Leader only
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
                  Showing {filteredRegistrations.length} of {enrichedRegistrations.length} registrations ·{" "}
                  <span className="font-semibold text-slate-700">{activeCount} active</span>
                </div>
              </div>
            )}

            {/* Cards View */}
            {viewMode === "CARDS" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRegistrations.map((registration) => {
                  const canCancel = canCancelRegistration(registration);
                  const hasTicket = canViewTicket(registration);

                  return (
                    <div
                      key={`card-${registration.id}`}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
                    >
                      <div className="space-y-3">
                        {/* Header Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getActivityTypeBadgeStyle(
                              registration.activityType
                            )}`}
                          >
                            {getActivityTypeLabel(registration.activityType)}
                          </span>

                          <RegistrationStatusBadge status={registration.status} />
                        </div>

                        {/* Title & Event */}
                        <div>
                          <h3 className="text-base font-bold text-slate-900 leading-snug">
                            {registration.activityName}
                          </h3>
                          {registration.eventName && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {registration.eventName}
                            </p>
                          )}
                        </div>

                        {/* Metadata Details */}
                        <div className="space-y-2 rounded-xl bg-slate-50/80 p-3 text-xs text-slate-600 border border-slate-100">
                          {registration.registrationType === "TEAM" ? (
                            <div className="flex items-center gap-1.5 font-medium text-purple-700">
                              <Users className="h-3.5 w-3.5" />
                              <span>Team: {registration.teamName || "Team Entry"}</span>
                              {registration.teamMemberIds && (
                                <span className="text-slate-400">
                                  ({registration.teamMemberIds.length})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 font-medium text-blue-700">
                              <User className="h-3.5 w-3.5" />
                              <span>Individual Entry</span>
                            </div>
                          )}

                          {registration.startDateTime && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate">
                                {formatDateRange(
                                  registration.startDateTime,
                                  registration.endDateTime
                                )}
                              </span>
                            </div>
                          )}

                          {registration.location && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{registration.location}</span>
                            </div>
                          )}
                        </div>

                        {/* Extra Notes */}
                        {registration.reviewNote && (
                          <div className="rounded-lg bg-amber-50/60 p-2.5 text-xs text-amber-800 border border-amber-200/60">
                            <span className="font-semibold">Note: </span>
                            {registration.reviewNote}
                          </div>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                        {hasTicket && (
                          <button
                            type="button"
                            onClick={() => handleOpenTicketModal(registration)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            <Ticket className="h-3.5 w-3.5" />
                            Ticket
                          </button>
                        )}

                        {onViewResults && registration.activityId && (
                          <button
                            type="button"
                            onClick={() => onViewResults(registration.activityId)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 shadow-xs hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            <Trophy className="h-3.5 w-3.5 text-amber-600" />
                            Results
                          </button>
                        )}

                        {canCancel && (
                          <button
                            type="button"
                            disabled={Boolean(cancellingId)}
                            onClick={() => {
                              setCancelError("");
                              setRegToCancel(registration);
                            }}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {cancellingId === registration.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(regToCancel)}
        title={
          regToCancel?.registrationType === "TEAM"
            ? "Cancel team registration?"
            : "Cancel registration?"
        }
        message={
          cancelError ||
          (regToCancel?.registrationType === "TEAM"
            ? `Cancel the team registration for "${regToCancel?.activityName}"? This will cancel the entry for the entire team roster. A new registration will depend on the deadline, available capacity and approval rules.`
            : `Cancel your registration for "${regToCancel?.activityName}"? A new registration will depend on the deadline, available capacity and approval rules.`)
        }
        confirmLabel={
          regToCancel?.registrationType === "TEAM"
            ? "Cancel Team Registration"
            : "Cancel Registration"
        }
        cancelLabel="Go Back"
        isDestructive
        isLoading={Boolean(cancellingId)}
        onConfirm={confirmCancellation}
        onCancel={() => {
          setRegToCancel(null);
          setCancelError("");
        }}
      />

      {/* Inline Ticket Modal */}
      {ticketModalReg && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseTicketModal();
          }}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {ticketModalReg.activityName || ticketModalReg.eventName || "Entry Ticket"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check-in pass for {ticketModalReg.registrationKind === "EVENT" ? "Event entry" : "Activity"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseTicketModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {ticketLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Generating your ticket...</span>
              </div>
            ) : ticketError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <p className="font-semibold">Unable to display ticket</p>
                  <p className="mt-0.5">{ticketError}</p>
                </div>
              </div>
            ) : modalTicket ? (
              <div className="space-y-4">
                <QrTicketCard ticket={modalTicket} title={ticketModalReg.activityName || ticketModalReg.eventName} />
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <Link
                    to={`/participant/ticket?registrationId=${ticketModalReg.id}&scope=${ticketModalReg.activityId ? "ACTIVITY" : "EVENT"}`}
                    className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                  >
                    <span>Full page view</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleCloseTicketModal}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
