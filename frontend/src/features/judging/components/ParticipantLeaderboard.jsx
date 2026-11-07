import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Trophy,
  Medal,
  Award,
  Crown,
  RefreshCw,
  AlertCircle,
  Calendar,
  Users,
  User,
  Sparkles,
  Search,
  X,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import {
  getParticipantLeaderboardResults,
  getApiErrorMessage
} from "../api/judgingApi";
import { formatDateTime } from "../utils/judgingFormatter";

export default function ParticipantLeaderboard({
  myRegistrations = [],
  selectedActivityId = null,
  onBrowseEvents,
  onClearSelectedActivity
}) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state for active result
  const [selectedResult, setSelectedResult] = useState(null);

  // Set of participant's own registration IDs for highlighting
  const myRegistrationIdSet = useMemo(() => {
    return new Set(
      (Array.isArray(myRegistrations) ? myRegistrations : [])
        .map((r) => r.id)
        .filter(Boolean)
    );
  }, [myRegistrations]);

  const fetchResults = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await getParticipantLeaderboardResults();
      const list = Array.isArray(data) ? data : [];
      setResults(list);

      // Auto-open modal if navigated with selectedActivityId
      if (selectedActivityId) {
        const match = list.find((r) => r.activityId === selectedActivityId);
        if (match) {
          setSelectedResult(match);
        }
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load competition results."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedActivityId]);

  useEffect(() => {
    fetchResults(false);
  }, [fetchResults]);

  // Sync if selectedActivityId changes after mount
  useEffect(() => {
    if (selectedActivityId && results.length > 0) {
      const match = results.find((r) => r.activityId === selectedActivityId);
      if (match) {
        setSelectedResult(match);
      }
    }
  }, [selectedActivityId, results]);

  const handleRefresh = () => {
    if (loading || refreshing) return;
    fetchResults(true);
  };

  const handleCloseModal = () => {
    setSelectedResult(null);
    onClearSelectedActivity?.();
  };

  // Filter list by query
  const filteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return results;

    return results.filter((res) => {
      const act = (res.activityName || "").toLowerCase();
      const rnd = (res.roundName || "").toLowerCase();
      return act.includes(q) || rnd.includes(q);
    });
  }, [results, searchQuery]);

  // Find participant's entry in a result
  const findMyEntry = useCallback(
    (result) => {
      const entries = result.entries || [];
      return entries.find(
        (e) =>
          e.isMyEntry === true ||
          (e.registrationId && myRegistrationIdSet.has(e.registrationId))
      );
    },
    [myRegistrationIdSet]
  );

  return (
    <div className="space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Trophy className="h-6 w-6 text-amber-500" />
            Competition Results
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Select any completed competition to view official scores and leaderboards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search competitions"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search competition..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-7 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-600" : "text-slate-500"}`}
            />
            <span>{refreshing ? "Updating..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-slate-500 shadow-xs">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-xs font-medium text-slate-600">Loading published results...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center shadow-xs">
          <AlertCircle className="mx-auto h-6 w-6 text-rose-600" />
          <h3 className="mt-2 text-sm font-bold text-rose-900">Unable to load results</h3>
          <p className="mt-1 text-xs text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => fetchResults(false)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 border border-amber-200">
            <Trophy className="h-6 w-6 text-amber-500" />
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-900">No results published yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
            Published competition results for your registered activities will appear here once
            evaluations are finalized.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className="h-3 w-3" />
              Check Updates
            </button>
            {onBrowseEvents && (
              <button
                type="button"
                onClick={onBrowseEvents}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                Browse Competitions
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results Table / List */}
      {!loading && !error && results.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Competition & Round
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Published
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Ranking Policy
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Your Standing
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((result) => {
                  const myEntry = findMyEntry(result);
                  const isSeparate =
                    result.rankingPolicy === "SEPARATE_BY_ENTRY_TYPE";

                  return (
                    <tr
                      key={result.roundId}
                      onClick={() => setSelectedResult(result)}
                      className="transition-colors hover:bg-indigo-50/40 cursor-pointer group"
                    >
                      {/* Competition & Round Name */}
                      <td className="px-5 py-4 space-y-1 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {result.activityName || "Competition"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Round {result.sequence || 1}: {result.roundName}
                        </p>
                      </td>

                      {/* Published Date */}
                      <td className="px-4 py-4 text-xs text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateTime(result.publishedAt)}</span>
                        </div>
                      </td>

                      {/* Ranking Policy */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                          {isSeparate ? "Separate (Indiv/Team)" : "Combined Ranking"}
                        </span>
                      </td>

                      {/* Your Standing */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {myEntry ? (
                          <div className="flex items-center gap-2">
                            <RankPill rank={myEntry.rank} />
                            <div className="text-xs">
                              <span className="font-mono font-bold text-slate-900">
                                {myEntry.totalScore != null
                                  ? Number(myEntry.totalScore).toFixed(2)
                                  : "—"}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">pts</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResult(result);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-100 hover:border-indigo-300 transition-colors cursor-pointer"
                        >
                          <Trophy className="h-3.5 w-3.5 text-amber-600" />
                          <span>View Leaderboard</span>
                          <ChevronRight className="h-3 w-3 text-indigo-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
            Showing {filteredResults.length} of {results.length} published competition results
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {selectedResult && (
        <RoundResultsModal
          result={selectedResult}
          myRegistrationIdSet={myRegistrationIdSet}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

function RoundResultsModal({ result, myRegistrationIdSet, onClose }) {
  const rankingPolicy = result.rankingPolicy || "COMBINED_ALL_ENTRIES";
  const entries = Array.isArray(result.entries) ? result.entries : [];
  const isSeparate = rankingPolicy === "SEPARATE_BY_ENTRY_TYPE";

  const [activeTab, setActiveTab] = useState("ALL"); // "ALL" | "INDIVIDUAL" | "TEAM"

  const individualEntries = useMemo(
    () => entries.filter((e) => (e.entryType || e.registrationType) === "INDIVIDUAL"),
    [entries]
  );

  const teamEntries = useMemo(
    () => entries.filter((e) => (e.entryType || e.registrationType) === "TEAM"),
    [entries]
  );

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/40 p-5 sm:px-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                <Sparkles className="h-3 w-3" />
                {result.activityName || "Competition"}
              </span>

              <span className="text-xs text-slate-400">·</span>

              <span className="text-xs text-slate-500 font-medium">
                Published {formatDateTime(result.publishedAt)}
              </span>
            </div>

            <h3 className="mt-1.5 text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Round {result.sequence || 1}: {result.roundName}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Tabs for Separate Ranking */}
        {isSeparate && (
          <div className="flex items-center gap-1.5 px-6 pt-3 pb-2 border-b border-slate-100 bg-slate-50/60 shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 uppercase tracking-wider">
              Filter:
            </span>
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              All ({entries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("INDIVIDUAL")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "INDIVIDUAL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Individual ({individualEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("TEAM")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "TEAM"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Team ({teamEntries.length})
            </button>
          </div>
        )}

        {/* Modal Body - Scrollable Leaderboard Table */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {isSeparate ? (
            <div className="space-y-5">
              {(activeTab === "ALL" || activeTab === "INDIVIDUAL") && (
                <div>
                  {activeTab === "ALL" && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                      <User className="h-3.5 w-3.5 text-blue-600" />
                      <span>Individual Leaderboard</span>
                    </div>
                  )}
                  <ModalLeaderboardTable
                    entries={individualEntries}
                    myRegistrationIdSet={myRegistrationIdSet}
                    emptyText="No individual entries in this round."
                  />
                </div>
              )}

              {(activeTab === "ALL" || activeTab === "TEAM") && (
                <div>
                  {activeTab === "ALL" && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                      <Users className="h-3.5 w-3.5 text-purple-600" />
                      <span>Team Leaderboard</span>
                    </div>
                  )}
                  <ModalLeaderboardTable
                    entries={teamEntries}
                    myRegistrationIdSet={myRegistrationIdSet}
                    emptyText="No team entries in this round."
                  />
                </div>
              )}
            </div>
          ) : (
            <ModalLeaderboardTable
              entries={entries}
              myRegistrationIdSet={myRegistrationIdSet}
              emptyText="No entries recorded for this round."
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-3 shrink-0">
          <span className="text-xs text-slate-400">
            Total participants: <span className="font-semibold text-slate-600">{entries.length}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalLeaderboardTable({ entries, myRegistrationIdSet, emptyText }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center text-xs text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th scope="col" className="w-16 px-3 py-2.5 text-center">
              Rank
            </th>
            <th scope="col" className="px-3 py-2.5">
              Entry Name
            </th>
            <th scope="col" className="w-24 px-3 py-2.5">
              Type
            </th>
            <th scope="col" className="w-20 px-3 py-2.5 text-right">
              Score
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {entries.map((entry, index) => {
            const isMine =
              entry.isMyEntry === true ||
              (entry.registrationId && myRegistrationIdSet.has(entry.registrationId));

            const rank = entry.rank;
            const type =
              (entry.entryType || entry.registrationType) === "TEAM"
                ? "Team"
                : (entry.entryType || entry.registrationType) === "INDIVIDUAL"
                ? "Individual"
                : "—";

            return (
              <tr
                key={entry.registrationId || index}
                className={`transition-colors ${
                  isMine
                    ? "bg-indigo-50/70 border-l-4 border-l-indigo-600"
                    : "hover:bg-slate-50/60"
                }`}
              >
                {/* Rank */}
                <td className="px-3 py-2.5 text-center">
                  <RankPill rank={rank} />
                </td>

                {/* Entry Name */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`font-semibold ${
                        isMine ? "text-indigo-950 font-bold" : "text-slate-900"
                      }`}
                    >
                      {entry.entryName || "Unnamed"}
                    </span>
                    {isMine && (
                      <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider">
                        You
                      </span>
                    )}
                  </div>
                </td>

                {/* Type */}
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                      type === "Team"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {type === "Team" ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {type}
                  </span>
                </td>

                {/* Score */}
                <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-slate-900">
                  {entry.totalScore != null ? Number(entry.totalScore).toFixed(2) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankPill({ rank }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
        <Crown className="h-3 w-3 fill-amber-400 text-amber-500" />1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
        <Medal className="h-3 w-3 text-slate-500" />2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-800">
        <Award className="h-3 w-3 text-orange-700" />3
      </span>
    );
  }
  return <span className="font-mono text-xs font-semibold text-slate-500">#{rank ?? "—"}</span>;
}
