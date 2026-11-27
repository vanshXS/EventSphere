import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  UserPlus,
  Users,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Play,
  Lock,
  BarChart3,
} from "lucide-react";
import {
  getCompetition,
  getJudgingRounds,
  getRoundAssignments,
  getRoundInvitations,
  assignJudge,
  inviteJudgeByEmail,
  revokeJudgeAssignment,
  revokeJudgeInvitation,
  copyRoundAssignments,
  openJudgingRound,
  closeJudgingRound,
  setupActivityJudging,
  getApiErrorMessage,
} from "../api/judgingApi";

export default function JudgeAssignmentManager({
  activities = [],
  selectedActivityId: initialActivityId = "",
  eventId = null,
}) {
  const [selectedActId, setSelectedActId] = useState(
    initialActivityId || (activities.length > 0 ? activities[0].id : "")
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [competition, setCompetition] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [judgeEmail, setJudgeEmail] = useState("");
  const [submittingJudge, setSubmittingJudge] = useState(false);
  const [copiedLink, setCopiedLink] = useState("");
  const [busyActionId, setBusyActionId] = useState("");
  const [targetCopyRoundId, setTargetCopyRoundId] = useState("");
  const [enablingJudging, setEnablingJudging] = useState(false);

  const currentActivity = activities.find((a) => String(a.id) === String(selectedActId)) || null;

  // Load activity judging data (competition + rounds)
  const loadJudgingData = useCallback(
    async (quiet = false) => {
      if (!selectedActId) return;
      if (quiet) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        let comp = null;
        try {
          comp = await getCompetition(selectedActId);
        } catch (e) {
          if (e.response?.status !== 404) throw e;
          comp = null;
        }
        setCompetition(comp);

        const roundList = await getJudgingRounds(selectedActId);
        const sorted = (roundList || []).sort(
          (a, b) => Number(a.sequence || 0) - Number(b.sequence || 0)
        );
        setRounds(sorted);

        // Keep selected round or select first
        if (sorted.length > 0) {
          setSelectedRoundId((prev) => {
            const exists = sorted.some((r) => String(r.id || r.roundId) === String(prev));
            return exists ? prev : String(sorted[0].id || sorted[0].roundId);
          });
        } else {
          setSelectedRoundId("");
        }
      } catch (err) {
        console.error("Failed to load judging data:", err);
        setError(getApiErrorMessage(err, "Failed to load judging configuration."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedActId]
  );

  useEffect(() => {
    loadJudgingData();
  }, [loadJudgingData]);

  // Load judges and invitations for selected round
  const loadRoundJudges = useCallback(async () => {
    if (!selectedRoundId) {
      setAssignments([]);
      setInvitations([]);
      return;
    }

    try {
      const [assigns, invites] = await Promise.all([
        getRoundAssignments(selectedRoundId),
        getRoundInvitations(selectedRoundId),
      ]);
      setAssignments(assigns || []);
      setInvitations(invites || []);
    } catch (err) {
      console.error("Failed to load round judges:", err);
    }
  }, [selectedRoundId]);

  useEffect(() => {
    loadRoundJudges();
  }, [loadRoundJudges]);

  // Quick 1-click enable judging for this activity if not enabled yet
  const handleEnableJudgingQuick = async () => {
    if (!selectedActId) return;
    setEnablingJudging(true);
    setError("");
    try {
      await setupActivityJudging(
        selectedActId,
        {
          enabled: true,
          mode: "SINGLE_STAGE",
          rounds: [
            {
              name: "Final Evaluation",
              description: "Main judging round",
              criteria: [
                { name: "Technical Quality", maxScore: 10, weight: 50 },
                { name: "Presentation & Impact", maxScore: 10, weight: 50 },
              ],
            },
          ],
        },
        currentActivity?.registrationType || "INDIVIDUAL"
      );
      setSuccess("Judging enabled with default scoring rubric.");
      await loadJudgingData(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not enable judging."));
    } finally {
      setEnablingJudging(false);
    }
  };

  // Add / Invite Judge
  const handleAddJudge = async (e) => {
    e.preventDefault();
    const email = judgeEmail.trim();
    if (!email || !selectedRoundId) return;

    setSubmittingJudge(true);
    setError("");
    setSuccess("");

    try {
      // Try direct assignment first (for existing users)
      let added = null;
      try {
        added = await assignJudge(selectedRoundId, email);
        setSuccess(`Judge ${email} assigned directly.`);
      } catch (assignErr) {
        // Fallback to sending invite link
        const invite = await inviteJudgeByEmail(selectedRoundId, email);
        setSuccess(`Invitation created for ${email}. Share the link below.`);
      }

      setJudgeEmail("");
      await loadRoundJudges();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not assign or invite judge."));
    } finally {
      setSubmittingJudge(false);
    }
  };

  // Revoke Assignment
  const handleRevokeAssignment = async (judgeId) => {
    if (!window.confirm("Are you sure you want to revoke this judge's access?")) return;
    setBusyActionId(`revoke-assign-${judgeId}`);
    setError("");
    try {
      await revokeJudgeAssignment(selectedRoundId, judgeId);
      setSuccess("Judge assignment revoked.");
      await loadRoundJudges();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not revoke judge assignment."));
    } finally {
      setBusyActionId("");
    }
  };

  // Revoke Invitation
  const handleRevokeInvitation = async (invitationId) => {
    if (!window.confirm("Revoke this pending judge invitation?")) return;
    setBusyActionId(`revoke-invite-${invitationId}`);
    setError("");
    try {
      await revokeJudgeInvitation(selectedRoundId, invitationId);
      setSuccess("Judge invitation revoked.");
      await loadRoundJudges();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not revoke invitation."));
    } finally {
      setBusyActionId("");
    }
  };

  // Copy Panel from another round
  const handleCopyPanel = async () => {
    if (!targetCopyRoundId || !selectedRoundId) return;
    setBusyActionId("copy-panel");
    setError("");
    try {
      await copyRoundAssignments(targetCopyRoundId, selectedRoundId);
      setSuccess("Judges copied successfully.");
      await loadRoundJudges();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not copy judges."));
    } finally {
      setBusyActionId("");
    }
  };

  const handleCopyLink = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(text);
      setTimeout(() => setCopiedLink(""), 2000);
    } catch {
      setError("Failed to copy link to clipboard.");
    }
  };

  const selectedRound = rounds.find(
    (r) => String(r.id || r.roundId) === String(selectedRoundId)
  );

  return (
    <div className="space-y-4">
      {/* Activity Selector Pills (if multiple activities) */}
      {activities.length > 1 && (
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 shrink-0">
            Activity:
          </span>
          {activities.map((act) => {
            const isSelected = String(act.id) === String(selectedActId);
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => setSelectedActId(act.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {act.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 font-bold ml-2">
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="text-emerald-500 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500">Loading judging console...</p>
        </div>
      ) : !competition || !competition.judgingEnabled || rounds.length === 0 ? (
        /* Empty / Judging Not Enabled State */
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Judging is not yet configured for {currentActivity?.name || "this activity"}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Enable judging to create scoring rounds, assign judges, and review evaluations.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleEnableJudgingQuick}
              disabled={enablingJudging}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {enablingJudging ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trophy className="w-4 h-4" />
              )}
              <span>{enablingJudging ? "Enabling..." : "Enable Judging for Activity"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Judging Configured: Round Selector & Judge Management */
        <div className="space-y-4">
          {/* Rounds Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 shrink-0">
                Judging Round:
              </span>
              {rounds.map((round, idx) => {
                const rId = String(round.id || round.roundId);
                const isSelected = rId === String(selectedRoundId);
                const status = round.status || "DRAFT";

                return (
                  <button
                    key={rId}
                    type="button"
                    onClick={() => setSelectedRoundId(rId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>{round.name || `Round ${idx + 1}`}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                        status === "OPEN"
                          ? "bg-emerald-500 text-white"
                          : status === "CLOSED"
                          ? "bg-slate-700 text-white"
                          : isSelected
                          ? "bg-indigo-700 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {status}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => loadJudgingData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Split Layout: Invite Judge Form (Left) + Assigned Roster (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Invite Form */}
            <div className="lg:col-span-1 space-y-4">
              <form
                onSubmit={handleAddJudge}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Assign Judge</h4>
                    <p className="text-[11px] text-slate-500">
                      To {selectedRound?.name || "current round"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Judge Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="email"
                      value={judgeEmail}
                      onChange={(e) => setJudgeEmail(e.target.value)}
                      placeholder="judge@college.edu"
                      disabled={submittingJudge}
                      className="w-full px-3 py-2 bg-slate-50 focus:bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingJudge || !judgeEmail.trim()}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer shadow-2xs"
                  >
                    {submittingJudge ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    <span>{submittingJudge ? "Assigning..." : "Assign / Invite Judge"}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
                  If the judge already has an account, they get assigned immediately. If not, a secure invitation link is generated below.
                </p>
              </form>

              {/* Copy Panel From Another Round (if 2+ rounds exist) */}
              {rounds.length > 1 && (
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Copy Judges from Another Round
                  </h5>
                  <div className="flex gap-2">
                    <select
                      value={targetCopyRoundId}
                      onChange={(e) => setTargetCopyRoundId(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-600"
                    >
                      <option value="">Select source round...</option>
                      {rounds
                        .filter((r) => String(r.id || r.roundId) !== String(selectedRoundId))
                        .map((r) => (
                          <option key={r.id || r.roundId} value={r.id || r.roundId}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleCopyPanel}
                      disabled={!targetCopyRoundId || busyActionId === "copy-panel"}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Assigned Judges Roster */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Assigned Judges · {selectedRound?.name || "Round"}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {assignments.filter((a) => a.status === "ACTIVE").length} active ·{" "}
                      {invitations.filter((i) => i.status === "PENDING").length} pending invites
                    </p>
                  </div>
                </div>

                {assignments.length === 0 && invitations.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-2">
                    <Users className="w-8 h-8 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-semibold text-slate-700">No Judges Assigned Yet</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Enter a judge's email in the form on the left to add them to this round.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {/* Active Assignments */}
                    {assignments.map((item) => {
                      const isRevoked = item.status === "REVOKED";
                      return (
                        <div
                          key={item.id || item.judgeId}
                          className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {item.judgeName || item.email || "Judge"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  item.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">{item.email}</p>
                          </div>

                          {!isRevoked && (
                            <button
                              type="button"
                              onClick={() => handleRevokeAssignment(item.judgeId)}
                              disabled={busyActionId === `revoke-assign-${item.judgeId}`}
                              className="text-xs text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer flex items-center gap-1 font-medium"
                              title="Revoke judge access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Revoke</span>
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Pending Invitations */}
                    {invitations.map((inv) => {
                      const isRevoked = inv.status === "REVOKED";
                      const inviteLink = inv.invitationLink;

                      return (
                        <div
                          key={inv.id}
                          className="p-4 space-y-2 hover:bg-slate-50/60 transition"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-900 truncate">
                                  {inv.email}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    inv.status === "PENDING"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">Invitation Pending</p>
                            </div>

                            {!isRevoked && (
                              <button
                                type="button"
                                onClick={() => handleRevokeInvitation(inv.id)}
                                disabled={busyActionId === `revoke-invite-${inv.id}`}
                                className="text-xs text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer flex items-center gap-1 font-medium"
                                title="Revoke invitation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Revoke</span>
                              </button>
                            )}
                          </div>

                          {inv.status === "PENDING" && inviteLink && (
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2">
                              <div className="truncate text-[11px] text-slate-500 font-mono flex-1">
                                {inviteLink}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(inviteLink)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 rounded text-xs font-semibold transition shrink-0 cursor-pointer"
                              >
                                {copiedLink === inviteLink ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

