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
  AlertCircle
} from "lucide-react";

import { useAuth } from "../../auth/AuthContext";

import {
  formatDateTime,
  formatDateRange
} from "../../events/utils/eventHelpers";

import {
  getActivityTypeLabel,
  getActivityTypeBadgeStyle
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
  currentUser
}) {
  const { user: authUser } = useAuth();
  const user = currentUser || authUser;
  const currentUserId = user?.userId || user?.id;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
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

  const canCancelRegistration = (registration) => {
    if (!isActiveRegistration(registration)) return false;

    if (registration.registrationType === "TEAM") {
      if (!currentUserId) return false;
      if (registration.teamLeaderId) {
        return registration.teamLeaderId === currentUserId;
      }
      return registration.participantId === currentUserId;
    }

    return true;
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

      return {
        ...registration,
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
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
        <Calendar className="mx-auto h-8 w-8 text-indigo-500" />

        <div>
          <h3 className="font-semibold text-slate-900">
            No registrations yet
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Explore an activity and register individually or with your team.
          </p>
        </div>

        {onBrowseEvents && (
          <button
            type="button"
            onClick={onBrowseEvents}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Explore Events
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {filters.map(([value, label]) => {
              const count = enrichedRegistrations.filter(
                (registration) => matchesStatus(registration, value)
              ).length;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    statusFilter === value
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search my registrations"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search activity, event or team"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {filteredRegistrations.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No registrations match your filters.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    {[
                      "Activity",
                      "Participation",
                      "Schedule / venue",
                      "Status / review",
                      "Registered",
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
                  {filteredRegistrations.map((registration) => (
                    <tr
                      key={registration.id}
                      className="align-top hover:bg-slate-50/60"
                    >
                      <td className="max-w-xs space-y-2 px-4 py-4">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getActivityTypeBadgeStyle(
                            registration.activityType
                          )}`}
                        >
                          {getActivityTypeLabel(
                            registration.activityType
                          )}
                        </span>

                        <p className="text-sm font-semibold text-slate-900">
                          {registration.activityName}
                        </p>

                        {registration.eventName && (
                          <p className="text-slate-500">
                            {registration.eventName}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {registration.registrationType === "TEAM" ? (
                          <>
                            <p className="font-semibold text-indigo-700">
                              {registration.teamName || "Team"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-slate-500">
                              <span className="text-xs">Team entry</span>
                              {registration.teamMemberIds && (
                                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600">
                                  {registration.teamMemberIds.length} members
                                </span>
                              )}
                            </div>
                            {registration.teamLeaderId && (
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {registration.teamLeaderId === currentUserId
                                  ? "Team Leader"
                                  : "Team Member"}
                              </p>
                            )}
                          </>
                        ) : (
                          "Individual"
                        )}
                      </td>

                      <td className="max-w-xs space-y-2 px-4 py-4 text-slate-600">
                        {registration.startDateTime && (
                          <div className="flex items-start gap-1.5">
                            <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                            <span>
                              {formatDateRange(
                                registration.startDateTime,
                                registration.endDateTime
                              )}
                            </span>
                          </div>
                        )}

                        {registration.location && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{registration.location}</span>
                          </div>
                        )}
                      </td>

                      <td className="max-w-xs space-y-2 px-4 py-4">
                        <RegistrationStatusBadge
                          status={registration.status}
                        />

                        {registration.reviewedAt && (
                          <p className="text-[11px] text-slate-500">
                            Reviewed{" "}
                            {formatDateTime(registration.reviewedAt)}
                          </p>
                        )}

                        {registration.reviewNote && (
                          <p className="whitespace-pre-wrap break-words text-slate-600">
                            {registration.reviewNote}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-500">
                        {formatDateTime(registration.registeredAt)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {(registration.ticket || isActiveRegistration(registration)) && (
                            <button
                              type="button"
                              onClick={() => handleOpenTicketModal(registration)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors cursor-pointer shadow-xs"
                              title="View Check-in QR Ticket"
                            >
                              <Ticket className="h-3.5 w-3.5" />
                              View Ticket
                            </button>
                          )}

                          {canCancelRegistration(registration) ? (
                          <button
                            type="button"
                            disabled={Boolean(cancellingId)}
                            onClick={() => {
                              setCancelError("");
                              setRegToCancel(registration);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                          >
                            {cancellingId === registration.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            Cancel
                          </button>
                        ) : isActiveRegistration(registration) &&
                          registration.registrationType === "TEAM" ? (
                          <span
                            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500"
                            title="Only the team leader can cancel this team registration"
                          >
                            Leader only
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            No actions
                          </span>
                        )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
              Showing {filteredRegistrations.length} of{" "}
              {enrichedRegistrations.length} registrations ·{" "}
              {activeCount} active
            </p>
          </div>
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