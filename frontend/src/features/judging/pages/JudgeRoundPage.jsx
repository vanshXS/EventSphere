import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, RefreshCw, Search, Users } from "lucide-react";
import JudgeWorkspaceLayout from "../components/JudgeWorkspaceLayout";
import { EmptyState, ErrorNotice, LoadingState, StatusBadge, inputClass } from "../components/JudgingUi";
import { getApiErrorMessage, getEligibleRegistrations, getMyAssignedRounds } from "../api/judgingApi";
import { formatScheduledDateTime } from "../utils/judgingFormatter";

export default function JudgeRoundPage() {
  const { roundId } = useParams();
  const [round, setRound] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [entryFilter, setEntryFilter] = useState("ALL");

  const fetchRoundData = useCallback(async () => {
    const assignedRounds = await getMyAssignedRounds();
    const assignedRound = assignedRounds.find((item) => item.roundId === roundId);
    if (!assignedRound) throw new Error("This judging round is not assigned to your account.");
    const entries = await getEligibleRegistrations(roundId);
    return { assignedRound, entries };
  }, [roundId]);

  const loadRound = async () => {
    setRefreshing(true);
    setError("");
    try {
      const data = await fetchRoundData();
      setRound(data.assignedRound);
      setRegistrations(data.entries);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load round entries."));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetchRoundData()
      .then(({ assignedRound, entries }) => {
        if (!ignore) {
          setRound(assignedRound);
          setRegistrations(entries);
          setError("");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setRound(null);
          setRegistrations([]);
          setError(getApiErrorMessage(err, "Unable to load round entries."));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [fetchRoundData]);

  const scoringOpen = round?.status === "OPEN";
  const completedCount = registrations.filter((entry) => entry.evaluationStatus === "SUBMITTED").length;
  const filteredRegistrations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return registrations.filter((entry) => {
      const name = entry.entryName || entry.participantName || "";
      const matchesQuery = !normalizedQuery || name.toLowerCase().includes(normalizedQuery);
      const matchesFilter = entryFilter === "ALL"
        || (entryFilter === "TO_REVIEW" && entry.evaluationStatus !== "SUBMITTED")
        || entry.evaluationStatus === entryFilter;
      return matchesQuery && matchesFilter;
    });
  }, [registrations, query, entryFilter]);

  return (
    <JudgeWorkspaceLayout title={round?.roundName || "Judging round"}>
      {loading ? (
        <LoadingState label="Loading round entries…" />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-start gap-3">
              <Link
                to="/judge"
                aria-label="Back to rounds"
                className="mt-1 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                  {round?.activityName || "Activity"}
                </p>
                <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-950">
                  {round?.roundName || "Judging round"}
                </h1>
                {round?.description && <p className="mt-1 text-sm text-slate-500">{round.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={round?.status} />
                  <span className="text-xs text-slate-500">
                    {round?.criteria?.length || 0} scoring criteria
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">{completedCount} of {registrations.length} submitted</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">Scheduled ({round?.scheduledTimeZoneId || "timezone not set"}): {round?.scheduledStartDateTime && round?.scheduledEndDateTime ? `${formatScheduledDateTime(round.scheduledStartDateTime)} – ${formatScheduledDateTime(round.scheduledEndDateTime)}` : "Not scheduled"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadRound}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <ErrorNotice message={error} onDismiss={() => setError("")} />
          {!error && round && (
            <>
              <div className={`flex items-center gap-2 border-l-2 px-3 py-2 text-xs ${scoringOpen ? "border-emerald-500 bg-emerald-50/70 text-emerald-900" : "border-amber-400 bg-amber-50/70 text-amber-900"}`}>
                {scoringOpen
                  ? "Scoring is open. Select an eligible entry to save or submit your evaluation."
                  : round?.status === "DRAFT" && !round?.activityActualStartDateTime
                    ? "Waiting for the organizer to start the activity. Scheduled round times do not open scoring automatically."
                    : round?.status === "DRAFT"
                      ? "The activity has started. Scoring will be available when the organizer opens this round."
                      : round?.status === "PUBLISHED"
                        ? "This round's results have been published. You can review your saved evaluations."
                        : "Scoring is closed. You can review your saved evaluations."}
              </div>
              {registrations.length === 0 ? (
                <EmptyState
                  title="No eligible entries"
                  description="Approved entries for this activity will appear here."
                />
              ) : (
                <section className="space-y-3">
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-500" />
                      <h2 className="text-sm font-bold text-slate-900">
                        Entries <span className="font-medium text-slate-400">{filteredRegistrations.length}/{registrations.length}</span>
                      </h2>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label className="relative block sm:w-64">
                        <span className="sr-only">Search entries</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input className={`${inputClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an entry" />
                      </label>
                      <select className={`${inputClass} sm:w-44`} value={entryFilter} onChange={(event) => setEntryFilter(event.target.value)} aria-label="Filter entries by evaluation status">
                        <option value="ALL">All evaluations</option>
                        <option value="TO_REVIEW">Needs evaluation</option>
                        <option value="DRAFT">Draft saved</option>
                        <option value="SUBMITTED">Submitted</option>
                      </select>
                    </div>
                  </div>
                  {filteredRegistrations.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">No entries match these filters.</p>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {filteredRegistrations.map((entry) => (
                        <article key={entry.registrationId} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${entry.evaluationStatus === "SUBMITTED" ? "bg-emerald-500" : entry.evaluationStatus === "DRAFT" ? "bg-amber-400" : "bg-slate-300"}`} aria-hidden="true" />
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-slate-900">{entry.entryName || entry.participantName || "Entry"}</h3>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {entry.registrationType === "TEAM" ? "Team" : "Individual"}
                                {entry.roster?.length ? ` · ${entry.roster.length} participant${entry.roster.length === 1 ? "" : "s"}` : ""}
                                {entry.myTotalScore !== null && entry.myTotalScore !== undefined ? ` · Your score ${entry.myTotalScore}` : ""}
                              </p>
                              {entry.rosterNote && <p className="mt-1 text-xs text-amber-700">{entry.rosterNote}</p>}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <StatusBadge status={entry.evaluationStatus || "NOT_STARTED"} className="!px-2 !py-0.5 !text-[10px]" />
                            <Link to={`/judge/rounds/${roundId}/entries/${entry.registrationId}`} className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${scoringOpen ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                              {entry.evaluationStatus === "SUBMITTED" ? "Review" : entry.evaluationStatus === "DRAFT" ? "Continue" : "Evaluate"}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}
    </JudgeWorkspaceLayout>
  );
}
