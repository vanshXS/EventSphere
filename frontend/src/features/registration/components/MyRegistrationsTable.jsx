import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Award, CalendarDays, Clock3, ExternalLink, Loader2, MapPin, Search, Ticket, Trophy, UserRound, Users, X } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { formatDateRange } from "../../events/utils/eventHelpers";
import { getActivityTypeLabel, getActivityTypeBadgeStyle, isEnded } from "../../activities/utils/activityHelpers";
import { isActiveRegistration, normalizeRegistrationStatus } from "../utils/registrationHelpers";
import RegistrationStatusBadge from "./RegistrationStatusBadge";
import ConfirmDialog from "../../events/components/ConfirmDialog";
import QrTicketCard from "./QrTicketCard";
import { getActivityTicket, getEventTicket } from "../../attendance/attendanceApi";
import { downloadCertificate } from "../../certificates/certificateApi";

const filters = [["ALL","All"],["ACTIVE","Active"],["PENDING","Pending"],["APPROVED","Approved"],["REJECTED","Rejected"],["CANCELLED","Cancelled"]];
const matchesStatus = (registration, filter) => filter === "ALL" ? true : filter === "ACTIVE" ? isActiveRegistration(registration) : normalizeRegistrationStatus(registration.status) === filter;

function canCancelRegistration(registration, userId) {
  if (!registration || registration.isCompleted || registration.isCancelled || registration.isRejected || registration.isEnded || registration.isEventCancelled || !isActiveRegistration(registration)) return false;
  if (registration.registrationType === "TEAM") {
    if (!userId) return false;
    return registration.teamLeaderId ? registration.teamLeaderId === userId : registration.participantId === userId;
  }
  return true;
}
function canViewTicket(registration) {
  if (!registration || registration.isCancelled || registration.isRejected || registration.isEventCancelled) return false;
  return normalizeRegistrationStatus(registration.status) === "APPROVED" || registration.status === "REGISTERED";
}
function entryLabel(registration) {
  if (registration.registrationType === "TEAM") return registration.teamName || "Team entry";
  if (registration.registrationType === "BOTH") return "Individual / Team";
  return "Individual";
}

export default function MyRegistrationsTable({
  registrations = [], events = [], standaloneActivities = [], myTeams = [], certificates = [],
  publishedResults = [], cancellingId, onCancelRegistration, onBrowseEvents, onViewResults, currentUser
}) {
  const { user: authUser } = useAuth();
  const user = currentUser || authUser;
  const currentUserId = user?.userId || user?.id;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "CARDS" : "TABLE");
  const [regToCancel, setRegToCancel] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [ticketModalReg, setTicketModalReg] = useState(null);
  const [modalTicket, setModalTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const [downloadingCertId, setDownloadingCertId] = useState(null);

  const enrichedRegistrations = useMemo(() => {
    const activities = new Map(standaloneActivities.map(item => [item.id,item]));
    const eventMap = new Map(events.map(item => [item.id,item]));
    const teams = new Map(myTeams.map(item => [item.id,item]));
    return registrations.map(reg => {
      const activity = activities.get(reg.activityId);
      const event = eventMap.get(reg.eventId);
      const team = teams.get(reg.teamId);
      const completed = Boolean(activity?.status === "COMPLETED" || event?.eventStatus === "COMPLETED" || event?.status === "COMPLETED" || activity?.actualEndDateTime || normalizeRegistrationStatus(reg.status) === "COMPLETED" || isEnded(activity) || (event?.endDateTime && Date.parse(event.endDateTime) <= Date.now()) || (reg.endDateTime && Date.parse(reg.endDateTime) <= Date.now()));
      const eventCancelled = Boolean(activity?.status === "CANCELLED" || event?.eventStatus === "CANCELLED" || event?.status === "CANCELLED");
      const cancelled = eventCancelled || normalizeRegistrationStatus(reg.status) === "CANCELLED";
      const rejected = normalizeRegistrationStatus(reg.status) === "REJECTED";
      const certificate = certificates.find(cert =>
        (cert.registrationId && cert.registrationId === reg.id) ||
        (reg.activityId && cert.activityId && cert.activityId === reg.activityId) ||
        (reg.eventId && cert.eventId && cert.eventId === reg.eventId) ||
        ((cert.scopeName || "").trim().toLowerCase() === (reg.activityName || activity?.name || "").trim().toLowerCase() && Boolean(cert.scopeName)) ||
        ((cert.scopeName || "").trim().toLowerCase() === (reg.eventName || event?.title || "").trim().toLowerCase() && Boolean(cert.scopeName))
      );
      return {
        ...reg, activity, event, isCompleted: completed, isEnded: completed,
        isEventCancelled: eventCancelled, isCancelled: cancelled, isRejected: rejected,
        matchingCert: certificate,
        hasPublishedResults: Boolean(reg.activityId && publishedResults.some(item => item.activityId === reg.activityId)),
        activityName: reg.activityName || activity?.name || event?.title || "Registration",
        activityType: reg.activityType || activity?.activityType || activity?.type || "OTHER",
        eventName: reg.eventName || event?.title || null,
        teamName: reg.teamName || team?.name || null,
        teamMemberIds: reg.teamMemberIds || null,
        teamLeaderId: reg.teamLeaderId || null,
        startDateTime: reg.startDateTime || activity?.startDateTime || event?.startDateTime,
        endDateTime: reg.endDateTime || activity?.endDateTime || event?.endDateTime,
        location: reg.location || activity?.location || event?.venue
      };
    });
  }, [registrations, standaloneActivities, events, myTeams, certificates, publishedResults]);

  const filteredRegistrations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return enrichedRegistrations.filter(reg => {
      if (!matchesStatus(reg,statusFilter)) return false;
      if (!query) return true;
      return [reg.activityName,reg.eventName,reg.teamName,reg.location].some(value => String(value || "").toLowerCase().includes(query));
    });
  }, [enrichedRegistrations,statusFilter,searchQuery]);
  const activeCount = enrichedRegistrations.filter(isActiveRegistration).length;

  const handleDownloadCertificate = async cert => {
    if (!cert?.id) return;
    try {
      setDownloadingCertId(cert.id);
      await downloadCertificate(cert.id,cert.certificateNumber || "Certificate");
    } catch {
      setCancelError("Could not download the certificate. Please try again.");
    } finally {
      setDownloadingCertId(null);
    }
  };
  const handleOpenTicket = async registration => {
    setTicketModalReg(registration);
    setModalTicket(null);
    setTicketError("");
    if (registration.ticket?.qrPayload) {
      setModalTicket(registration.ticket);
      return;
    }
    try {
      setTicketLoading(true);
      const load = registration.activityId ? getActivityTicket : getEventTicket;
      setModalTicket(await load(registration.id));
    } catch (error) {
      setTicketError(error.response?.data?.message || "Could not load the QR ticket.");
    } finally {
      setTicketLoading(false);
    }
  };
  const closeTicket = () => { setTicketModalReg(null); setModalTicket(null); setTicketError(""); };
  const confirmCancellation = async () => {
    if (!regToCancel || cancellingId) return;
    setCancelError("");
    try {
      const result = await onCancelRegistration(regToCancel);
      if (result && result.success !== false && result !== false) setRegToCancel(null);
      else setCancelError(result?.message || "Cancellation was not confirmed. Refresh and try again.");
    } catch (error) {
      setCancelError(error.response?.data?.message || "Could not cancel this registration.");
    }
  };

  const actions = (reg, compact = false) => {
    const canCancel = canCancelRegistration(reg,currentUserId);
    const hasTicket = canViewTicket(reg);
    return (
      <div className={compact ? "grid grid-cols-3 gap-2" : "flex flex-wrap items-center justify-end gap-2"}>
        {hasTicket && <button type="button" onClick={() => handleOpenTicket(reg)} className={compact ? "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-indigo-100 px-2 text-xs font-semibold text-indigo-700" : "inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700"}><Ticket size={15}/>Ticket</button>}
        {reg.hasPublishedResults && onViewResults && <button type="button" onClick={() => onViewResults(reg.activityId)} className={compact ? "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-indigo-100 px-2 text-xs font-semibold text-slate-800" : "inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-3 py-2 text-xs font-semibold text-slate-800"}><Trophy size={15}/>Results</button>}
        {reg.matchingCert && <button type="button" disabled={downloadingCertId === reg.matchingCert.id} onClick={() => handleDownloadCertificate(reg.matchingCert)} className={compact ? "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-300 px-2 text-xs font-semibold text-emerald-950 disabled:opacity-60" : "inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-60"}>{downloadingCertId === reg.matchingCert.id ? <Loader2 size={15} className="animate-spin"/> : <Award size={15}/>}Certificate</button>}
        {canCancel && <button type="button" disabled={Boolean(cancellingId)} onClick={() => {setCancelError("");setRegToCancel(reg);}} className={compact ? "col-span-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white text-xs font-semibold text-rose-600 disabled:opacity-50" : "inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-50"}><X size={14}/>Cancel</button>}
        {!compact && !canCancel && reg.registrationType === "TEAM" && reg.teamLeaderId && reg.teamLeaderId !== currentUserId && isActiveRegistration(reg) && <span className="text-[11px] text-slate-400">Leader only</span>}
      </div>
    );
  };

  if (registrations.length === 0) return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
      <CalendarDays className="mx-auto h-8 w-8 text-slate-300"/>
      <h3 className="mt-3 text-base font-semibold text-slate-900">No registrations yet</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Your event and activity registrations will appear here after you join them.</p>
      {onBrowseEvents && <button type="button" onClick={onBrowseEvents} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Discover events</button>}
    </div>
  );

  return (
    <>
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-2.5" aria-label="Registration status filters">
          {filters.map(([value,label]) => {
            const count = enrichedRegistrations.filter(reg => matchesStatus(reg,value)).length;
            const active = statusFilter === value;
            return <button key={value} type="button" onClick={() => setStatusFilter(value)} aria-pressed={active} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${active ? "bg-indigo-700 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
              {label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-indigo-50 text-indigo-700"}`}>{count}</span>
            </button>;
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Search registrations" placeholder="Search by activity, event, team or location..." className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"/>
          </div>
          <div className="hidden items-center gap-1 rounded-lg bg-white p-1 md:flex">
            <button type="button" onClick={() => setViewMode("TABLE")} aria-pressed={viewMode === "TABLE"} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold ${viewMode === "TABLE" ? "bg-indigo-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}>▤ Table</button>
            <button type="button" onClick={() => setViewMode("CARDS")} aria-pressed={viewMode === "CARDS"} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold ${viewMode === "CARDS" ? "bg-indigo-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}>▦ Cards</button>
          </div>
        </div>

        {filteredRegistrations.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Search className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-3 text-sm font-semibold text-slate-700">No matching registrations found</p><p className="mt-1 text-xs text-slate-500">Try another search or status filter.</p></div> : <>
          <div className={`hidden overflow-hidden rounded-xl bg-white shadow-sm ${viewMode === "TABLE" ? "md:block" : "md:hidden"}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead className="bg-indigo-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600"><tr><th className="px-5 py-4">Activity / Event</th><th className="px-4 py-4">Entry type</th><th className="px-4 py-4">Schedule &amp; venue</th><th className="px-4 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRegistrations.map(reg => <tr key={reg.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="max-w-[270px] px-5 py-4"><span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${getActivityTypeBadgeStyle(reg.activityType)}`}>{getActivityTypeLabel(reg.activityType)}</span><p className="mt-2 font-semibold text-slate-900">{reg.activityName}</p>{reg.eventName && <p className="mt-0.5 text-xs text-slate-500">{reg.eventName}</p>}{reg.registrationCode && <p className="mt-1 font-mono text-[10px] text-slate-400">#{reg.registrationCode}</p>}</td>
                    <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700">{reg.registrationType === "TEAM" ? <Users size={14}/> : <UserRound size={14}/>}{entryLabel(reg)}</span>{reg.registrationType === "TEAM" && reg.teamMemberIds?.length > 0 && <p className="mt-1 text-[11px] text-slate-400">{reg.teamMemberIds.length} members</p>}</td>
                    <td className="max-w-[230px] px-4 py-4">{reg.startDateTime && <div className="flex items-start gap-2 text-xs font-medium text-slate-700"><CalendarDays size={15} className="mt-0.5 shrink-0 text-indigo-600"/><span>{formatDateRange(reg.startDateTime,reg.endDateTime)}</span></div>}{reg.location && <div className="mt-1.5 flex items-start gap-2 text-xs text-slate-500"><MapPin size={15} className="mt-0.5 shrink-0 text-slate-400"/><span>{reg.location}</span></div>}</td>
                    <td className="px-4 py-4"><div className="flex flex-wrap items-center gap-1.5"><RegistrationStatusBadge status={reg.status}/>{reg.isEnded && <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"><Clock3 size={12}/>Ended</span>}{reg.isEventCancelled && <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">Event cancelled</span>}</div>{reg.reviewNote && <p className="mt-2 max-w-[190px] text-[11px] leading-relaxed text-slate-500">{reg.reviewNote}</p>}</td>
                    <td className="px-5 py-4">{actions(reg)}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-indigo-50/60 px-5 py-4 text-xs text-slate-600"><span>Showing {filteredRegistrations.length} of {enrichedRegistrations.length} registrations · <strong className="text-emerald-700">{activeCount} active {activeCount === 1 ? "entry" : "entries"}</strong></span><span className="font-medium text-indigo-700">EventSphere</span></div>
          </div>

          <div className={`grid grid-cols-1 gap-4 md:hidden ${viewMode === "TABLE" ? "" : ""}`}>
            {filteredRegistrations.map(reg => <article key={`mobile-${reg.id}`} className="overflow-hidden rounded-xl border border-slate-200 border-t-[3px] border-t-indigo-700 bg-white shadow-sm"><div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${getActivityTypeBadgeStyle(reg.activityType)}`}>{getActivityTypeLabel(reg.activityType)}</span><div className="flex flex-wrap items-center gap-1.5"><RegistrationStatusBadge status={reg.status}/>{reg.isEnded && <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"><Clock3 size={12}/>Ended</span>}</div></div>
              <div><h2 className="text-lg font-semibold tracking-tight text-slate-900">{reg.activityName}</h2>{reg.eventName && <p className="mt-1 text-xs text-slate-500">{reg.eventName}</p>}<p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700">{reg.registrationType === "TEAM" ? <Users size={15}/> : <UserRound size={15}/>}{entryLabel(reg)}</p></div>
              <div className="space-y-2 rounded-lg bg-indigo-50/60 p-3.5">{reg.startDateTime && <div className="flex items-start gap-2.5 text-sm text-slate-800"><CalendarDays size={17} className="mt-0.5 shrink-0 text-slate-500"/><span>{formatDateRange(reg.startDateTime,reg.endDateTime)}</span></div>}{reg.location && <div className="flex items-start gap-2.5 text-sm text-slate-600"><MapPin size={17} className="mt-0.5 shrink-0 text-slate-500"/><span>{reg.location}</span></div>}</div>
              {reg.reviewNote && <p className="rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-900"><strong>Organizer note: </strong>{reg.reviewNote}</p>}
              {actions(reg,true)}
            </div></article>)}
            <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-600"><span>Showing {filteredRegistrations.length} of {enrichedRegistrations.length} registrations</span><span className="inline-flex items-center gap-1.5 font-semibold text-indigo-700"><span className="h-2 w-2 rounded-full bg-indigo-600"/>{activeCount} active {activeCount === 1 ? "entry" : "entries"}</span></div>
          </div>

          {viewMode === "CARDS" && <div className="hidden grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:grid">{filteredRegistrations.map(reg => <article key={`card-${reg.id}`} className="overflow-hidden rounded-xl border border-slate-200 border-t-[3px] border-t-indigo-700 bg-white shadow-sm"><div className="space-y-4 p-5"><div className="flex items-center justify-between gap-2"><span className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${getActivityTypeBadgeStyle(reg.activityType)}`}>{getActivityTypeLabel(reg.activityType)}</span><RegistrationStatusBadge status={reg.status}/></div><div><h2 className="text-base font-semibold text-slate-900">{reg.activityName}</h2>{reg.eventName && <p className="mt-1 text-xs text-slate-500">{reg.eventName}</p>}<p className="mt-2 text-sm font-medium text-indigo-700">{entryLabel(reg)}</p></div><div className="space-y-2 rounded-lg bg-indigo-50/60 p-3 text-xs text-slate-700">{reg.startDateTime && <p className="flex gap-2"><CalendarDays size={14}/>{formatDateRange(reg.startDateTime,reg.endDateTime)}</p>}{reg.location && <p className="flex gap-2"><MapPin size={14}/>{reg.location}</p>}</div>{reg.reviewNote && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{reg.reviewNote}</p>}{actions(reg,true)}</div></article>)}</div>}
        </>}
      </section>

      <ConfirmDialog isOpen={Boolean(regToCancel)} title={regToCancel?.registrationType === "TEAM" ? "Cancel team registration?" : "Cancel registration?"} message={cancelError || (regToCancel?.registrationType === "TEAM" ? `Cancel the team registration for "${regToCancel?.activityName}"? This cancels the entry for the entire team roster.` : `Cancel your registration for "${regToCancel?.activityName}"?`)} confirmLabel={regToCancel?.registrationType === "TEAM" ? "Cancel Team Registration" : "Cancel Registration"} cancelLabel="Go Back" isDestructive isLoading={Boolean(cancellingId)} onConfirm={confirmCancellation} onCancel={() => {setRegToCancel(null);setCancelError("");}}/>

      {ticketModalReg && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={event => {if(event.target === event.currentTarget) closeTicket();}}><div className="relative max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3"><div><h2 className="text-base font-bold text-slate-900">{ticketModalReg.activityName || ticketModalReg.eventName || "Entry ticket"}</h2><p className="mt-0.5 text-xs text-slate-500">Check-in pass for {ticketModalReg.registrationKind === "EVENT" ? "event entry" : "activity"}</p></div><button type="button" onClick={closeTicket} aria-label="Close ticket" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={17}/></button></div>{ticketLoading ? <div className="flex flex-col items-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-7 w-7 animate-spin text-indigo-600"/>Loading ticket...</div> : ticketError ? <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"><AlertCircle size={16} className="mt-0.5 shrink-0"/>{ticketError}</div> : modalTicket ? <div className="space-y-4"><QrTicketCard ticket={modalTicket} title={ticketModalReg.activityName || ticketModalReg.eventName}/><div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><Link to={`/participant/ticket?registrationId=${ticketModalReg.id}&scope=${ticketModalReg.activityId ? "ACTIVITY" : "EVENT"}`} className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-indigo-600">Full page view <ExternalLink size={13}/></Link><button type="button" onClick={closeTicket} className="rounded-lg bg-slate-100 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-200">Done</button></div></div> : null}</div></div>}
    </>
  );
}
