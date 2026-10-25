import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, Search } from "lucide-react";
import JudgeWorkspaceLayout from "../components/JudgeWorkspaceLayout";
import { EmptyState, ErrorNotice, LoadingState, StatusBadge, primaryButton, inputClass } from "../components/JudgingUi";
import { getApiErrorMessage, getMyAssignedRounds } from "../api/judgingApi";
import { formatScheduledDateTime } from "../utils/judgingFormatter";

export default function JudgeDashboardPage() {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadRounds = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const data = await getMyAssignedRounds();
      setRounds([...data].sort((a, b) => {
        const priority = { OPEN: 0, DRAFT: 1, CLOSED: 2, PUBLISHED: 3 };
        const statusCompare = (priority[a.status] ?? 4) - (priority[b.status] ?? 4);
        if (statusCompare !== 0) return statusCompare;
        const activityCompare = String(a.activityName || "").localeCompare(String(b.activityName || ""));
        return activityCompare || Number(a.sequence || 0) - Number(b.sequence || 0);
      }));
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load your assigned judging rounds."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadRounds());
  }, [loadRounds]);

  const filteredRounds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rounds.filter((round) => {
      const matchesQuery = !q || [round.activityName, round.roundName, round.description, round.eventId]
        .some((value) => String(value || "").toLowerCase().includes(q));
      const matchesStatus = statusFilter === "ALL" || round.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [rounds, query, statusFilter]);

  const openCount = rounds.filter((round) => round.status === "OPEN").length;
  const completedCount = rounds.filter((round) => round.status === "PUBLISHED").length;
  const waitingCount = rounds.filter((round) => round.status === "DRAFT").length;

  return (
    <JudgeWorkspaceLayout>
      <section className="flex flex-col gap-5 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Judge workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Your assignments</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">Pick up an open round and continue evaluating entries.</p>
          {!loading && !error && (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <span className="font-medium text-slate-600"><strong className="mr-1 text-base text-slate-900">{rounds.length}</strong> assigned</span>
              <span className="font-medium text-emerald-700"><strong className="mr-1 text-base">{openCount}</strong> open for scoring</span>
              <span className="font-medium text-amber-700"><strong className="mr-1 text-base">{waitingCount}</strong> waiting</span>
              <span className="font-medium text-indigo-700"><strong className="mr-1 text-base">{completedCount}</strong> published</span>
            </div>
          )}
        </div>
        <button type="button" onClick={() => loadRounds(true)} disabled={refreshing || loading} className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:self-auto">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </section>

      <ErrorNotice message={error} onDismiss={() => setError("")} />

      <section>
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold text-slate-900">Assigned rounds <span className="ml-1 font-medium text-slate-400">{filteredRounds.length}</span></h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block sm:w-72">
              <span className="sr-only">Search rounds</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className={`${inputClass} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search activities or rounds" />
            </label>
            <select className={`${inputClass} sm:w-44`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter rounds by status">
              <option value="ALL">All statuses</option><option value="OPEN">Open for scoring</option><option value="DRAFT">Waiting</option><option value="CLOSED">Closed</option><option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          {loading ? <LoadingState label="Loading your assignments…" /> : !error && filteredRounds.length === 0 ? (
            <EmptyState title={rounds.length === 0 ? "No judging rounds assigned yet" : "No rounds match your search"} description={rounds.length === 0 ? "When an organizer assigns you to a judging round, it will appear here. If you expected an assignment, contact the organizer." : "Try a different search or remove the status filter."} action={rounds.length > 0 ? <button onClick={() => { setQuery(""); setStatusFilter("ALL"); }} className={primaryButton}>Clear filters</button> : null} />
          ) : !error ? (
            <div className="divide-y divide-slate-200">
              {filteredRounds.map((round) => <RoundCard key={round.roundId || round.assignmentId} round={round} />)}
            </div>
          ) : null}
        </div>
      </section>
    </JudgeWorkspaceLayout>
  );
}

function RoundCard({ round }) {
  const roundId = round.roundId;
  const open = round.status === "OPEN";
  const published = round.status === "PUBLISHED";
  const waitingForActivity = round.status === "DRAFT" && !round.activityActualStartDateTime;
  return (
    <article className="grid gap-3 py-4 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${open ? "bg-emerald-500" : waitingForActivity ? "bg-amber-400" : "bg-slate-300"}`} aria-hidden="true" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-xs font-semibold text-indigo-700">{round.activityName || "Activity"}</p>
            <span className="text-slate-300">/</span>
            <h3 className="truncate text-sm font-bold text-slate-900">{round.roundName || `Round ${round.sequence || ""}`}</h3>
            <StatusBadge status={round.status} className="!px-2 !py-0.5 !text-[10px]" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {round.scheduledStartDateTime && round.scheduledEndDateTime
              ? `${formatScheduledDateTime(round.scheduledStartDateTime)} – ${formatScheduledDateTime(round.scheduledEndDateTime)}`
              : "Schedule not set"}
            <span className="mx-2 text-slate-300">·</span>
            {round.criteria?.length ?? 0} criteria
            {round.description && <><span className="mx-2 text-slate-300">·</span>{round.description}</>}
          </p>
          <p className={`mt-1 text-xs ${open ? "font-medium text-emerald-700" : "text-slate-500"}`}>
            {open ? "Ready for your evaluation" : published ? "Results published" : round.status === "CLOSED" ? "Scoring closed · review your saved work" : waitingForActivity ? "Waiting for organizer to start the activity" : "Waiting for organizer to open scoring"}
          </p>
        </div>
      </div>
      <Link to={`/judge/rounds/${roundId}`} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${open ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
        {open ? "Continue judging" : "View round"}<ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}
