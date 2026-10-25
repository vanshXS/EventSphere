import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Check, ChevronDown, ChevronUp, ClipboardCheck, Eye, LoaderCircle, Plus, RefreshCw, Save, Send, Settings2, ShieldCheck, Trash2, UserPlus, Users, X, BarChart3, Layers } from "lucide-react";
import { getActivitiesByEvent, getStandaloneActivity } from "../../activities/activityApi";
import {
  assignJudge,
  closeJudgingRound,
  createCompetition,
  createJudgingRound,
  updateCompetition,
  getApiErrorMessage,
  getCompetition,
  getJudgingRounds,
  getOrganizerResults,
  getRoundAssignments,
  getRoundClosurePreview,
  getRoundInvitations,
  inviteJudgeByEmail,
  openJudgingRound,
  publishJudgingResults,
  revokeJudgeAssignment,
  revokeJudgeInvitation,
  updateJudgingRound,
} from "../api/judgingApi";
import { EmptyState, ErrorNotice, LoadingState, StatusBadge, SuccessNotice, dangerButton, inputClass, labelClass, primaryButton, secondaryButton } from "../components/JudgingUi";
import { formatDateTime, formatScheduledDateTime, getLocalTimeZone, toDateTimeLocalValue } from "../utils/judgingFormatter";
import { getRecommendedRubric } from "../utils/recommendedRubrics";

const emptyConfig = { judgingEnabled: true, competitionMode: "MULTI_ROUND", rankingPolicy: "SEPARATE_BY_ENTRY_TYPE" };
const competitionModes = [
  { value: "SINGLE_STAGE", label: "Single stage", helper: "One judging round for this competition." },
  { value: "MULTI_ROUND", label: "Multiple rounds", helper: "Create separate rounds for different stages or days." },
];

const TABS = [
  { key: "overview", label: "Overview", icon: Layers },
  { key: "config", label: "Configuration", icon: Settings2 },
  { key: "rounds", label: "Rounds", icon: ClipboardCheck },
  { key: "results", label: "Results", icon: BarChart3 },
];

const getScheduledTimestamp = (value) => {
  if (!value) return Number.NaN;
  const text = String(value);
  return Date.parse(/[zZ]|[+-]\d{2}:\d{2}$/.test(text) ? text : `${text}Z`);
};

export default function OrganizerJudgingPage() {
  const { activityId } = useParams();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId");
  const [activity, setActivity] = useState(null);
  const [competition, setCompetition] = useState(null);
  const [configForm, setConfigForm] = useState(emptyConfig);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [creatingRound, setCreatingRound] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState("");
  const [customizeCriteria, setCustomizeCriteria] = useState(false);
  const [roundForm, setRoundForm] = useState({ name: "", description: "", scheduledStartDateTime: "", scheduledEndDateTime: "", scheduledTimeZoneId: getLocalTimeZone(), criteria: [] });
  const [expandedRoundId, setExpandedRoundId] = useState("");
  const [assignmentsByRound, setAssignmentsByRound] = useState({});
  const [invitationsByRound, setInvitationsByRound] = useState({});
  const [assignmentLoadingId, setAssignmentLoadingId] = useState("");
  const [judgeIdByRound, setJudgeIdByRound] = useState({});
  const [judgeEmailByRound, setJudgeEmailByRound] = useState({});
  const [invitationLinkByRound, setInvitationLinkByRound] = useState({});
  const [busyAction, setBusyAction] = useState("");
  const [selectedResultRound, setSelectedResultRound] = useState("");
  const [resultsByRound, setResultsByRound] = useState({});
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now());
    updateCurrentTime();
    const interval = window.setInterval(updateCurrentTime, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const loadData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      let activityData;
      if (eventId) {
        const activities = await getActivitiesByEvent(eventId);
        activityData = activities.find((item) => String(item.id) === String(activityId));
        if (!activityData) throw new Error("This activity was not found under the selected event.");
      } else {
        activityData = await getStandaloneActivity(activityId);
      }
      setActivity(activityData);

      const roundData = await getJudgingRounds(activityId);
      setRounds(roundData.sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0)));

      try {
        const config = await getCompetition(activityId);
        setCompetition(config);
        setConfigForm({
          judgingEnabled: config?.judgingEnabled !== false,
          competitionMode: config?.competitionMode || "MULTI_ROUND",
          rankingPolicy: config?.rankingPolicy || "SEPARATE_BY_ENTRY_TYPE",
        });
      } catch (configError) {
        if (configError.response?.status === 404) {
          setCompetition(null);
          setConfigForm({ ...emptyConfig });
        } else {
          throw configError;
        }
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load judging configuration."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activityId, eventId]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadData();
    });
    return () => { active = false; };
  }, [loadData]);

  const registrationType = activity?.registrationType || "INDIVIDUAL";
  const isBoth = registrationType === "BOTH";
  const configurationLocked = rounds.some((round) => ["OPEN", "CLOSED", "PUBLISHED"].includes(round.status));
  const hasStarted = Boolean(
    activity?.actualStartDateTime || activity?.status === "ONGOING"
  );
  const singleStageLimitReached = configForm.competitionMode === "SINGLE_STAGE" && rounds.length >= 1;
  const canCreateRound = Boolean(competition?.judgingEnabled) && !singleStageLimitReached;
  const recommendedCriteria = useMemo(() => getRecommendedRubric(activity?.type), [activity?.type]);
  const totalWeight = useMemo(() => roundForm.criteria.reduce((sum, item) => sum + (Number(item.weight) || 0), 0), [roundForm.criteria]);
  const remainingWeight = 100 - totalWeight;
  const resultsPolicy = competition?.rankingPolicy || configForm.rankingPolicy || "SEPARATE_BY_ENTRY_TYPE";
  const scheduleWarnings = useMemo(() => {
    const warnings = [];
    const { scheduledStartDateTime: start, scheduledEndDateTime: end } = roundForm;
    if (start && end && end <= start) warnings.push("The round end must be after its start.");
    if (start && activity?.startDateTime && start < toDateTimeLocalValue(activity.startDateTime)) {
      warnings.push("The round starts before the activity's scheduled start.");
    }
    if (start && activity?.endDateTime && start > toDateTimeLocalValue(activity.endDateTime)) {
      warnings.push("The round starts after the activity's scheduled end.");
    }
    if (end && activity?.startDateTime && end < toDateTimeLocalValue(activity.startDateTime)) {
      warnings.push("The round ends before the activity's scheduled start.");
    }
    if (end && activity?.endDateTime && end > toDateTimeLocalValue(activity.endDateTime)) {
      warnings.push("The round ends after the activity's scheduled end.");
    }
    if (start && end && end > start && rounds.some((round) => {
      if (String(round.id || round.roundId) === String(editingRoundId)) return false;
      const existingStart = toDateTimeLocalValue(round.scheduledStartDateTime);
      const existingEnd = toDateTimeLocalValue(round.scheduledEndDateTime);
      return existingStart && existingEnd && start < existingEnd && end > existingStart;
    })) warnings.push("This schedule overlaps another round. Overlapping schedules are not supported.");
    return warnings;
  }, [activity, editingRoundId, roundForm, rounds]);

  const openCreateForm = () => {
    setEditingRoundId("");
    setRoundForm({ name: "", description: "", scheduledStartDateTime: "", scheduledEndDateTime: "", scheduledTimeZoneId: getLocalTimeZone(), criteria: recommendedCriteria });
    setCustomizeCriteria(false);
    setShowRoundForm(true);
    setActiveTab("rounds");
  };

  const openEditForm = (round) => {
    setEditingRoundId(round.id || round.roundId);
    setRoundForm({
      name: round.name || round.roundName || "",
      description: round.description || "",
      scheduledStartDateTime: toDateTimeLocalValue(round.scheduledStartDateTime),
      scheduledEndDateTime: toDateTimeLocalValue(round.scheduledEndDateTime),
      scheduledTimeZoneId: round.scheduledTimeZoneId || getLocalTimeZone(),
      criteria: (round.criteria || []).map((criterion) => ({
        name: criterion.name || "",
        description: criterion.description || "",
        maxScore: String(criterion.maxScore ?? ""),
        weight: String(criterion.weight ?? ""),
      })),
    });
    setCustomizeCriteria(true);
    setShowRoundForm(true);
    setActiveTab("rounds");
  };

  const validateRubric = () => {
    if (!roundForm.name.trim()) return "Enter a name for this judging round.";
    if (roundForm.criteria.length === 0) return "Add at least one scoring criterion.";
    if (Math.abs(totalWeight - 100) > 0.0001) {
      return `Criterion weights must total 100%. ${remainingWeight >= 0 ? `${remainingWeight}% remains.` : `${Math.abs(remainingWeight)}% over 100%.`}`;
    }
    if (roundForm.criteria.length > 20) return "A round can have no more than 20 criteria.";
    const invalid = roundForm.criteria.find((item) =>
      !item.name.trim()
      || !Number.isFinite(Number(item.maxScore))
      || !(Number(item.maxScore) > 0)
      || !Number.isFinite(Number(item.weight))
      || !(Number(item.weight) > 0));
    if (invalid) return "Every criterion needs a name, a positive maximum score, and a positive weight.";
    const normalizedNames = roundForm.criteria.map((item) => item.name.trim().toLowerCase());
    if (new Set(normalizedNames).size !== normalizedNames.length) return "Criterion names must be unique.";
    return "";
  };

  const saveConfig = async (event) => {
    event.preventDefault();
    setSavingConfig(true); setError(""); setSuccess("");
    const payload = {
      judgingEnabled: configForm.judgingEnabled,
      competitionMode: configForm.judgingEnabled ? configForm.competitionMode : null,
      ...(isBoth && configForm.judgingEnabled ? { rankingPolicy: configForm.rankingPolicy } : {}),
    };
    try {
      const saved = competition
        ? await updateCompetition(activityId, payload)
        : await createCompetition(activityId, payload);
      setCompetition(saved);
      setConfigForm({
        judgingEnabled: saved?.judgingEnabled !== false,
        competitionMode: saved?.competitionMode || configForm.competitionMode,
        rankingPolicy: saved?.rankingPolicy || configForm.rankingPolicy,
      });
      setSuccess("Judging configuration saved.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save judging configuration."));
    } finally { setSavingConfig(false); }
  };

  const createRound = async (event) => {
    event.preventDefault();
    setError(""); setSuccess("");
    const validationError = validateRubric();
    if (validationError) { setError(validationError); return; }
    if (scheduleWarnings.length) { setError(scheduleWarnings[0]); return; }

    setCreatingRound(true);
    try {
      const created = await createJudgingRound(activityId, {
        name: roundForm.name.trim(),
        description: roundForm.description.trim() || null,
        scheduledStartDateTime: roundForm.scheduledStartDateTime || null,
        scheduledEndDateTime: roundForm.scheduledEndDateTime || null,
        scheduledTimeZoneId: roundForm.scheduledTimeZoneId || null,
        sequence: rounds.length + 1,
        criteria: roundForm.criteria.map((criterion) => ({
          name: criterion.name.trim(),
          description: criterion.description.trim() || null,
          maxScore: Number(criterion.maxScore),
          weight: Number(criterion.weight),
        })),
      });
      setRounds((previous) => [...previous, created].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0)));
      setRoundForm({ name: "", description: "", scheduledStartDateTime: "", scheduledEndDateTime: "", scheduledTimeZoneId: getLocalTimeZone(), criteria: [] });
      setShowRoundForm(false);
      setSuccess(`"${created.name || roundForm.name}" was created.`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create this judging round."));
    } finally { setCreatingRound(false); }
  };

  const saveDraftRound = async (event) => {
    event.preventDefault();
    setError(""); setSuccess("");
    const validationError = validateRubric();
    if (validationError) { setError(validationError); return; }
    if (scheduleWarnings.length) { setError(scheduleWarnings[0]); return; }

    setCreatingRound(true);
    try {
      const updated = await updateJudgingRound(editingRoundId, {
        name: roundForm.name.trim(),
        description: roundForm.description.trim() || null,
        scheduledStartDateTime: roundForm.scheduledStartDateTime || null,
        scheduledEndDateTime: roundForm.scheduledEndDateTime || null,
        scheduledTimeZoneId: roundForm.scheduledTimeZoneId || null,
        criteria: roundForm.criteria.map((criterion) => ({
          name: criterion.name.trim(),
          description: criterion.description.trim() || null,
          maxScore: Number(criterion.maxScore),
          weight: Number(criterion.weight),
        })),
      });
      setRounds((previous) => previous.map((round) =>
        String(round.id || round.roundId) === String(editingRoundId) ? updated : round));
      setShowRoundForm(false);
      setEditingRoundId("");
      setSuccess("Draft round and criteria saved.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save this draft round."));
    } finally { setCreatingRound(false); }
  };

  const runRoundAction = async (round, action) => {
    setBusyAction(`${action}:${round.id || round.roundId}`); setError(""); setSuccess("");
    try {
      if (action === "open") {
        if (!hasStarted) throw new Error("Start the activity before opening a judging round.");
        if (!round.scheduledStartDateTime || !round.scheduledEndDateTime) throw new Error("Set both scheduled start and end times before opening this round.");
        await openJudgingRound(round.id || round.roundId);
        setSuccess("Round opened. Assigned judges can now submit evaluations.");
      } else if (action === "close") {
        const roundId = round.id || round.roundId;
        const preview = await getRoundClosurePreview(roundId);
        const missingCount = Number(preview.missingEvaluationCount) || 0;
        if (missingCount > 0) {
          setError(`${missingCount} required evaluation${missingCount === 1 ? " is" : "s are"} still missing. This round will remain open until all required evaluations are submitted.`);
          return;
        }
        await closeJudgingRound(roundId);
        setSuccess("Round closed. Judges can no longer submit scores.");
      } else if (action === "publish") {
        if (!window.confirm("Publish the results for this round? Published results become visible according to the existing participant access rules.")) return;
        const result = await publishJudgingResults(round.id || round.roundId);
        setResultsByRound((previous) => ({ ...previous, [round.id || round.roundId]: result }));
        setSuccess("Results published successfully.");
      }
      await loadData(true);
    } catch (err) {
      setError(getApiErrorMessage(err, `Could not ${action} this judging round.`));
    } finally { setBusyAction(""); }
  };

  const toggleAssignments = async (round) => {
    const id = round.id || round.roundId;
    if (expandedRoundId === id) { setExpandedRoundId(""); return; }
    setExpandedRoundId(id);
    if (assignmentsByRound[id]) return;
    setAssignmentLoadingId(id); setError("");
    try {
      const [assignments, invitations] = await Promise.all([
        getRoundAssignments(id),
        getRoundInvitations(id),
      ]);
      setAssignmentsByRound((previous) => ({ ...previous, [id]: assignments }));
      setInvitationsByRound((previous) => ({ ...previous, [id]: invitations }));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load judge assignments. Check the assignment API path in judgingApi.js."));
    } finally { setAssignmentLoadingId(""); }
  };

  const inviteJudge = async (event, round) => {
    event.preventDefault();
    const roundKey = round.id || round.roundId;
    const email = (judgeEmailByRound[roundKey] || "").trim();
    if (!email) { setError("Enter the judge's email address."); return; }
    setBusyAction(`invite:${roundKey}`); setError(""); setSuccess("");
    try {
      const invitation = await inviteJudgeByEmail(roundKey, email);
      setInvitationsByRound((previous) => ({
        ...previous,
        [roundKey]: [invitation, ...(previous[roundKey] || [])],
      }));
      setInvitationLinkByRound((previous) => ({ ...previous, [roundKey]: invitation.invitationLink || "" }));
      setJudgeEmailByRound((previous) => ({ ...previous, [roundKey]: "" }));
      setSuccess(`Invitation created for ${invitation.email}. Share the secure invitation link with that judge.`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not invite this judge."));
    } finally { setBusyAction(""); }
  };

  const revokeInvitation = async (round, invitation) => {
    const roundKey = round.id || round.roundId;
    setBusyAction(`revoke-invitation:${invitation.id}`); setError(""); setSuccess("");
    try {
      const updated = await revokeJudgeInvitation(roundKey, invitation.id);
      setInvitationsByRound((previous) => ({
        ...previous,
        [roundKey]: (previous[roundKey] || []).map((item) => item.id === updated.id ? updated : item),
      }));
      setSuccess("Pending invitation revoked.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not revoke this invitation."));
    } finally { setBusyAction(""); }
  };

  const addJudge = async (event, round) => {
    event.preventDefault();
    const roundKey = round.id || round.roundId;
    const judgeEmail = (judgeIdByRound[roundKey] || "").trim();
    if (!judgeEmail) { setError("Enter the active judge's email address."); return; }
    setBusyAction(`assign:${roundKey}`); setError(""); setSuccess("");
    try {
      const created = await assignJudge(roundKey, judgeEmail);
      setAssignmentsByRound((previous) => ({ ...previous, [roundKey]: [created, ...(previous[roundKey] || [])] }));
      setJudgeIdByRound((previous) => ({ ...previous, [roundKey]: "" }));
      setSuccess(`Active judge ${judgeEmail} assigned to this round.`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not find an active judge account for this email. Invite the judge if they are new to EventSphere."));
    } finally { setBusyAction(""); }
  };

  const revokeAssignment = async (round, assignment) => {
    const roundKey = round.id || round.roundId;
    const judgeId = assignment.judgeId;
    if (!judgeId) { setError("This assignment response does not contain a judge ID."); return; }
    if (!window.confirm("Revoke this judge's access to the round?")) return;
    setBusyAction(`revoke:${judgeId}`); setError(""); setSuccess("");
    try {
      await revokeJudgeAssignment(roundKey, judgeId);
      setAssignmentsByRound((previous) => ({ ...previous, [roundKey]: (previous[roundKey] || []).map((item) => (String(item.judgeId) === String(judgeId) ? { ...item, status: "REVOKED" } : item)) }));
      setSuccess("Judge assignment revoked.");
    } catch (err) { setError(getApiErrorMessage(err, "Could not revoke this assignment.")); }
    finally { setBusyAction(""); }
  };

  const viewResults = async (round) => {
    const id = round.id || round.roundId;
    setSelectedResultRound(id); setError("");
    setActiveTab("results");
    if (resultsByRound[id]) return;
    try {
      const result = await getOrganizerResults(id);
      setResultsByRound((previous) => ({ ...previous, [id]: result }));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load published results."));
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-6xl"><LoadingState label="Loading activity and judging configuration…" /></div></div>;

  const openRounds = rounds.filter((r) => r.status === "OPEN").length;
  const draftRounds = rounds.filter((r) => r.status === "DRAFT").length;
  const closedRounds = rounds.filter((r) => r.status === "CLOSED").length;
  const publishedRounds = rounds.filter((r) => r.status === "PUBLISHED").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Sticky top header ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to={eventId ? `/organizer/events/${eventId}/operations?tab=activities` : "/organizer"} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-100" aria-label="Back to operations"><ArrowLeft className="h-4 w-4" /></Link>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">Organizer · Judging setup</p>
              <h1 className="truncate text-sm font-bold text-slate-900">{activity?.name || "Activity judging"}</h1>
            </div>
          </div>
          <button type="button" onClick={() => loadData(true)} disabled={refreshing} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* ── Tab navigation ── */}
      <nav className="sticky top-14 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${isActive ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.key === "rounds" && rounds.length > 0 && (
                    <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{rounds.length}</span>
                  )}
                  {tab.key === "results" && publishedRounds > 0 && (
                    <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{publishedRounds}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── Toast notifications ── */}
      <ErrorNotice message={error} onDismiss={() => setError("")} /><SuccessNotice message={success} />

      {/* ── Tab content ── */}
      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">

        {/* ═══════ OVERVIEW TAB ═══════ */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* Activity summary row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Activity status" value={<StatusBadge status={activity?.status || (activity?.actualEndDateTime ? "COMPLETED" : activity?.actualStartDateTime ? "ONGOING" : "PUBLISHED")} />} />
              <StatCard label="Entry type" value={registrationType === "BOTH" ? "Individual + Teams" : registrationType === "TEAM" ? "Teams" : "Individuals"} />
              <StatCard label="Total rounds" value={rounds.length} accent />
              <StatCard label="Open now" value={openRounds} accent={openRounds > 0} color="emerald" />
            </div>

            {/* Quick status grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MiniStatCard label="Draft" count={draftRounds} color="slate" />
              <MiniStatCard label="Open" count={openRounds} color="emerald" />
              <MiniStatCard label="Closed" count={closedRounds} color="amber" />
              <MiniStatCard label="Published" count={publishedRounds} color="indigo" />
            </div>

            {/* Schedule info */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CalendarClock className="h-4 w-4 text-slate-400" />Schedule
              </h3>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Scheduled</p>
                  <p className="mt-0.5 text-slate-800">{activity?.startDateTime && activity?.endDateTime ? `${formatDateTime(activity.startDateTime)} – ${formatDateTime(activity.endDateTime)}` : "Not scheduled"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Actual start</p>
                  <p className="mt-0.5 text-slate-800">{formatDateTime(activity?.actualStartDateTime)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Actual end</p>
                  <p className="mt-0.5 text-slate-800">{formatDateTime(activity?.actualEndDateTime)}</p>
                </div>
              </div>
            </div>

            {/* Organizer responsibilities */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-white p-1.5 text-indigo-600"><ShieldCheck className="h-4 w-4" /></span>
                <div>
                  <h3 className="text-sm font-semibold text-indigo-950">Organizer responsibilities</h3>
                  <p className="mt-1 text-xs leading-5 text-indigo-900/80">Start the activity through the existing activity operations workflow. Open a round only after its actual start time exists. Judges submit scores; you close the round and publish the results. Ending the activity does not automatically close scoring.</p>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              {!competition?.judgingEnabled && (
                <button type="button" onClick={() => setActiveTab("config")} className={primaryButton}><Settings2 className="h-4 w-4" />Set up configuration</button>
              )}
              {competition?.judgingEnabled && canCreateRound && (
                <button type="button" onClick={openCreateForm} className={primaryButton}><Plus className="h-4 w-4" />Create round</button>
              )}
              {rounds.length > 0 && (
                <button type="button" onClick={() => setActiveTab("rounds")} className={secondaryButton}><ClipboardCheck className="h-4 w-4" />Manage rounds</button>
              )}
              {publishedRounds > 0 && (
                <button type="button" onClick={() => setActiveTab("results")} className={secondaryButton}><BarChart3 className="h-4 w-4" />View results</button>
              )}
            </div>
          </div>
        )}

        {/* ═══════ CONFIGURATION TAB ═══════ */}
        {activeTab === "config" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Competition configuration</h2>
              <p className="mt-1 text-sm text-slate-500">Entry type is inherited from the activity's existing registration settings.</p>
            </div>

            <form onSubmit={saveConfig} className="space-y-4">
              {/* Enable judging toggle */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Enable judging</p>
                  <p className="mt-0.5 text-xs text-slate-500">Turn on judge assignments, rubric scoring, and result publication.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={configForm.judgingEnabled} disabled={configurationLocked || savingConfig} onChange={(e) => setConfigForm((previous) => ({ ...previous, judgingEnabled: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />Enabled
                </label>
              </div>

              {/* Competition mode */}
              <fieldset disabled={savingConfig || configurationLocked} className="grid grid-cols-1 gap-3 sm:grid-cols-2 disabled:opacity-70">
                {competitionModes.map((mode) => (
                  <label key={mode.value} className={`flex cursor-pointer gap-3 rounded-xl border bg-white p-4 transition ${configForm.competitionMode === mode.value ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200" : "border-slate-200 hover:border-slate-300"}`}>
                    <input type="radio" name="competitionMode" value={mode.value} checked={configForm.competitionMode === mode.value} onChange={(e) => setConfigForm((previous) => ({ ...previous, competitionMode: e.target.value }))} className="mt-1 h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{mode.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{mode.helper}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {/* Ranking policy for BOTH */}
              {isBoth && (
                <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Ranking policy</h3>
                    <p className="mt-0.5 text-xs text-slate-500">This setting appears because the activity accepts both individuals and teams.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className={`flex cursor-pointer gap-3 rounded-lg border bg-white p-3.5 ${configForm.rankingPolicy === "SEPARATE_BY_ENTRY_TYPE" ? "border-indigo-400 ring-1 ring-indigo-200" : "border-slate-200"}`}>
                      <input type="radio" name="rankingPolicy" value="SEPARATE_BY_ENTRY_TYPE" disabled={configurationLocked || savingConfig} checked={configForm.rankingPolicy === "SEPARATE_BY_ENTRY_TYPE"} onChange={(e) => setConfigForm((previous) => ({ ...previous, rankingPolicy: e.target.value }))} className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">Separate rankings</span>
                        <span className="mt-0.5 block text-xs text-slate-500">Individual and team leaderboards.</span>
                        <span className="mt-1.5 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">Recommended</span>
                      </span>
                    </label>
                    <label className={`flex cursor-pointer gap-3 rounded-lg border bg-white p-3.5 ${configForm.rankingPolicy === "COMBINED_ALL_ENTRIES" ? "border-indigo-400 ring-1 ring-indigo-200" : "border-slate-200"}`}>
                      <input type="radio" name="rankingPolicy" value="COMBINED_ALL_ENTRIES" disabled={configurationLocked || savingConfig} checked={configForm.rankingPolicy === "COMBINED_ALL_ENTRIES"} onChange={(e) => setConfigForm((previous) => ({ ...previous, rankingPolicy: e.target.value }))} className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">Combined ranking</span>
                        <span className="mt-0.5 block text-xs text-slate-500">One shared leaderboard ranked by score.</span>
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {configurationLocked && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Configuration is locked because judging has started or results already exist.</p>}

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">{competition ? "Update settings before judges begin scoring." : "Save this configuration before creating judging rounds."}</p>
                <button type="submit" disabled={savingConfig || configurationLocked} className={primaryButton}>
                  {savingConfig ? <><LoaderCircle className="h-4 w-4 animate-spin" />Saving…</> : <><Save className="h-4 w-4" />{competition ? "Save configuration" : "Enable judging"}</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ═══════ ROUNDS TAB ═══════ */}
        {activeTab === "rounds" && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Judging rounds</h2>
                <p className="mt-0.5 text-sm text-slate-500">Each round owns its rubric, judges, and scoring lifecycle.</p>
              </div>
              <button type="button" onClick={openCreateForm} disabled={!canCreateRound} className={primaryButton}><Plus className="h-4 w-4" />Create round</button>
            </div>

            {!competition?.judgingEnabled && (
              <EmptyState title="Judging is not enabled" description="Save the competition configuration first." action={<button type="button" onClick={() => setActiveTab("config")} className={primaryButton}><Settings2 className="h-4 w-4" />Go to configuration</button>} />
            )}

            {/* Round creation / edit form */}
            {competition?.judgingEnabled && showRoundForm && (
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h3 className="text-sm font-bold text-slate-900">{editingRoundId ? "Edit draft round" : "New judging round"}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {editingRoundId ? "Changes are saved to this draft. The rubric locks when the round opens." : `Recommended criteria for ${activity?.type || "this activity"}.`}
                  </p>
                </div>
                <form onSubmit={editingRoundId ? saveDraftRound : createRound} className="space-y-4 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div><label className={labelClass} htmlFor="round-name">Round name *</label><input id="round-name" className={inputClass} maxLength={100} value={roundForm.name} onChange={(e) => setRoundForm((previous) => ({ ...previous, name: e.target.value }))} placeholder="e.g. Prototype review" required /></div>
                    <div><label className={labelClass} htmlFor="round-description">Description</label><input id="round-description" className={inputClass} maxLength={500} value={roundForm.description} onChange={(e) => setRoundForm((previous) => ({ ...previous, description: e.target.value }))} placeholder="What judges should assess" /></div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div><label className={labelClass} htmlFor="round-scheduled-start">Scheduled start</label><input id="round-scheduled-start" type="datetime-local" className={inputClass} value={roundForm.scheduledStartDateTime} onChange={(e) => setRoundForm((previous) => ({ ...previous, scheduledStartDateTime: e.target.value }))} /></div>
                    <div><label className={labelClass} htmlFor="round-scheduled-end">Scheduled end</label><input id="round-scheduled-end" type="datetime-local" className={inputClass} value={roundForm.scheduledEndDateTime} onChange={(e) => setRoundForm((previous) => ({ ...previous, scheduledEndDateTime: e.target.value }))} /></div>
                  </div>
                  <p className="text-xs text-slate-500">Timezone: {roundForm.scheduledTimeZoneId || getLocalTimeZone()}. Both times are required before opening.</p>
                  {scheduleWarnings.length > 0 && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-5 text-amber-900">{scheduleWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
                  {!editingRoundId && <p className="text-xs text-slate-500">Sequence: <span className="font-semibold text-slate-700">{rounds.length + 1}</span></p>}

                  {/* Criteria section */}
                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">{customizeCriteria ? "Customize criteria" : "Recommended rubric"}</h4>
                        <p className="mt-0.5 text-xs text-slate-500">{customizeCriteria ? "Adjust criteria, scores, and weights." : "Ready to use, or customize."}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className={`font-bold ${Math.abs(totalWeight - 100) < 0.0001 ? "text-emerald-700" : "text-amber-800"}`}>Total weight: {totalWeight}%</p>
                        <p className="text-slate-500">{remainingWeight >= 0 ? `${remainingWeight}% remaining` : `${Math.abs(remainingWeight)}% over`}</p>
                      </div>
                    </div>

                    {!customizeCriteria && (
                      <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                        {roundForm.criteria.map((criterion, index) => (
                          <div key={`${criterion.name}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800">{criterion.name}</p>
                              {criterion.description && <p className="mt-0.5 truncate text-xs text-slate-500">{criterion.description}</p>}
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-indigo-700">10 pts · {criterion.weight}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {customizeCriteria && (
                      <div className="mt-3 space-y-2">
                        {roundForm.criteria.map((criterion, index) => (
                          <div key={index} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Criterion {index + 1}</p>
                              <button type="button" onClick={() => setRoundForm((previous) => ({ ...previous, criteria: previous.criteria.filter((_, itemIndex) => itemIndex !== index) }))} disabled={roundForm.criteria.length <= 1} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 className="h-3 w-3" />Remove</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div><label className={labelClass} htmlFor={`criterion-name-${index}`}>Name *</label><input id={`criterion-name-${index}`} maxLength={100} value={criterion.name} onChange={(e) => setRoundForm((previous) => ({ ...previous, criteria: previous.criteria.map((item, i) => i === index ? { ...item, name: e.target.value } : item) }))} className={inputClass} required /></div>
                              <div><label className={labelClass} htmlFor={`criterion-description-${index}`}>Description</label><input id={`criterion-description-${index}`} maxLength={500} value={criterion.description} onChange={(e) => setRoundForm((previous) => ({ ...previous, criteria: previous.criteria.map((item, i) => i === index ? { ...item, description: e.target.value } : item) }))} className={inputClass} /></div>
                              <div><label className={labelClass} htmlFor={`criterion-max-${index}`}>Max score *</label><input id={`criterion-max-${index}`} type="number" min="0.01" step="0.01" value={criterion.maxScore} onChange={(e) => setRoundForm((previous) => ({ ...previous, criteria: previous.criteria.map((item, i) => i === index ? { ...item, maxScore: e.target.value } : item) }))} className={inputClass} required /></div>
                              <div><label className={labelClass} htmlFor={`criterion-weight-${index}`}>Weight (%) *</label><input id={`criterion-weight-${index}`} type="number" min="0.01" max="100" step="0.01" value={criterion.weight} onChange={(e) => setRoundForm((previous) => ({ ...previous, criteria: previous.criteria.map((item, i) => i === index ? { ...item, weight: e.target.value } : item) }))} className={inputClass} required /></div>
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={() => setRoundForm((previous) => ({ ...previous, criteria: [...previous.criteria, { name: "", description: "", maxScore: "10", weight: "" }] }))} disabled={roundForm.criteria.length >= 20} className={secondaryButton}><Plus className="h-4 w-4" />Add criterion</button>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {!customizeCriteria && <button type="button" onClick={() => setCustomizeCriteria(true)} className={secondaryButton}>Customize criteria</button>}
                      {editingRoundId && <button type="button" onClick={() => setRoundForm((previous) => ({ ...previous, criteria: getRecommendedRubric(activity?.type) }))} className={secondaryButton}>Use recommended</button>}
                      {customizeCriteria && <button type="button" onClick={() => setCustomizeCriteria(false)} className={secondaryButton}>Preview rubric</button>}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                    <button type="button" onClick={() => { setShowRoundForm(false); setEditingRoundId(""); }} className={secondaryButton}>Cancel</button>
                    <button type="submit" disabled={creatingRound || scheduleWarnings.length > 0 || Math.abs(totalWeight - 100) > 0.0001 || roundForm.criteria.length === 0} className={primaryButton}>
                      {creatingRound ? <><LoaderCircle className="h-4 w-4 animate-spin" />Saving…</> : editingRoundId ? <><Save className="h-4 w-4" />Save draft</> : <><Check className="h-4 w-4" />Create round</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Round list */}
            {competition?.judgingEnabled && rounds.length === 0 && !showRoundForm && (
              <EmptyState title="No rounds configured yet" description={configForm.competitionMode === "SINGLE_STAGE" ? "Create the single round for judging." : "Create a round for each judging stage."} action={<button type="button" onClick={openCreateForm} className={primaryButton}><Plus className="h-4 w-4" />Create first round</button>} />
            )}
            <div className="space-y-3">
              {rounds.map((round) => (
                <RoundManagementCard
                  key={round.id || round.roundId}
                  round={round}
                  activityStarted={hasStarted}
                  currentTime={currentTime}
                  busyAction={busyAction}
                  onRoundAction={runRoundAction}
                  onEdit={() => openEditForm(round)}
                  expanded={expandedRoundId === (round.id || round.roundId)}
                  onToggleAssignments={() => toggleAssignments(round)}
                  assignmentLoading={assignmentLoadingId === (round.id || round.roundId)}
                  assignments={assignmentsByRound[round.id || round.roundId] || []}
                  invitations={invitationsByRound[round.id || round.roundId] || []}
                  judgeId={judgeIdByRound[round.id || round.roundId] || ""}
                  judgeEmail={judgeEmailByRound[round.id || round.roundId] || ""}
                  invitationLink={invitationLinkByRound[round.id || round.roundId] || ""}
                  onJudgeIdChange={(value) => setJudgeIdByRound((previous) => ({ ...previous, [round.id || round.roundId]: value }))}
                  onJudgeEmailChange={(value) => setJudgeEmailByRound((previous) => ({ ...previous, [round.id || round.roundId]: value }))}
                  onAssign={(event) => addJudge(event, round)}
                  onInvite={(event) => inviteJudge(event, round)}
                  onRevokeInvitation={(invitation) => revokeInvitation(round, invitation)}
                  onRevoke={(assignment) => revokeAssignment(round, assignment)}
                  selectedResultRound={selectedResultRound}
                  result={resultsByRound[round.id || round.roundId]}
                  rankingPolicy={resultsPolicy}
                  onViewResults={() => viewResults(round)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ═══════ RESULTS TAB ═══════ */}
        {activeTab === "results" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Published results</h2>
              <p className="mt-0.5 text-sm text-slate-500">View published leaderboards for completed rounds.</p>
            </div>

            {publishedRounds === 0 && closedRounds === 0 && (
              <EmptyState title="No results available" description="Close and publish a round to see results here." />
            )}

            {/* Published rounds list */}
            {rounds.filter((r) => ["CLOSED", "PUBLISHED"].includes(r.status)).length > 0 && (
              <div className="space-y-3">
                {rounds.filter((r) => ["CLOSED", "PUBLISHED"].includes(r.status)).map((round) => {
                  const roundId = round.id || round.roundId;
                  const isSelected = selectedResultRound === roundId;
                  const roundResult = resultsByRound[roundId];
                  return (
                    <div key={roundId} className="rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">Round {round.sequence ?? "—"}</span>
                          <h3 className="truncate text-sm font-semibold text-slate-900">{round.name || round.roundName || `Round ${round.sequence || ""}`}</h3>
                          <StatusBadge status={round.status} />
                        </div>
                        <div className="flex gap-2">
                          {round.status === "CLOSED" && (
                            <button type="button" onClick={() => runRoundAction(round, "publish")} disabled={busyAction === `publish:${roundId}`} className={primaryButton}>
                              {busyAction === `publish:${roundId}` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Publish
                            </button>
                          )}
                          {round.status === "PUBLISHED" && (
                            <button type="button" onClick={() => viewResults(round)} className={isSelected ? secondaryButton : primaryButton}>
                              <Eye className="h-4 w-4" />{isSelected ? "Viewing" : "View results"}
                            </button>
                          )}
                        </div>
                      </div>
                      {isSelected && roundResult && (
                        <div className="border-t border-slate-100 p-4">
                          <ResultsView result={roundResult} rankingPolicy={roundResult.rankingPolicy || resultsPolicy || "SEPARATE_BY_ENTRY_TYPE"} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Compact stat cards for the overview ── */
function StatCard({ label, value, accent = false, color = "indigo" }) {
  const colorMap = { indigo: "text-indigo-700", emerald: "text-emerald-700", amber: "text-amber-700", slate: "text-slate-700" };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className={`mt-1.5 text-lg font-bold ${accent ? colorMap[color] || colorMap.indigo : "text-slate-900"}`}>
        {typeof value === "number" ? value : value}
      </div>
    </div>
  );
}

function MiniStatCard({ label, count, color = "slate" }) {
  const dotColors = { slate: "bg-slate-400", emerald: "bg-emerald-500", amber: "bg-amber-500", indigo: "bg-indigo-500" };
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
      <span className={`h-2 w-2 rounded-full ${dotColors[color] || dotColors.slate}`} />
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className="ml-auto text-sm font-bold text-slate-900">{count}</span>
    </div>
  );
}

/* ── Round management card — compact, expandable ── */
function RoundManagementCard({ round, activityStarted, currentTime, busyAction, onRoundAction, onEdit, expanded, onToggleAssignments, assignmentLoading, assignments, invitations, judgeId, judgeEmail, invitationLink, onJudgeIdChange, onJudgeEmailChange, onAssign, onInvite, onRevokeInvitation, onRevoke, selectedResultRound, result, rankingPolicy, onViewResults }) {
  const roundId = round.id || round.roundId;
  const busy = ["open", "close", "publish"].some((action) => busyAction === `${action}:${roundId}`);
  const canPublish = round.status === "CLOSED";
  const canAssign = round.status === "DRAFT";
  const roundCriteria = round.criteria || [];
  const roundWeight = roundCriteria.reduce((sum, criterion) => sum + (Number(criterion.weight) || 0), 0);
  const rubricNames = roundCriteria.map((criterion) => criterion.name?.trim().toLowerCase());
  const rubricValid = roundCriteria.length > 0
    && roundCriteria.length <= 20
    && Math.abs(roundWeight - 100) <= 0.0001
    && roundCriteria.every((criterion) => criterion.id
      && criterion.name?.trim()
      && Number.isFinite(Number(criterion.maxScore))
      && Number(criterion.maxScore) > 0
      && Number.isFinite(Number(criterion.weight))
      && Number(criterion.weight) > 0)
    && new Set(rubricNames).size === rubricNames.length;

  const [showCriteria, setShowCriteria] = useState(false);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
      {/* Compact header row */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">R{round.sequence ?? "—"}</span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">{round.name || round.roundName || `Round ${round.sequence || ""}`}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <StatusBadge status={round.status} className="!py-0.5 !text-[10px]" />
              <span>{roundCriteria.length} criteria</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{round.scheduledStartDateTime && round.scheduledEndDateTime ? `${formatScheduledDateTime(round.scheduledStartDateTime)} – ${formatScheduledDateTime(round.scheduledEndDateTime)}` : "Not scheduled"}</span>
            </div>
          </div>
        </div>

        {/* Action buttons — compact */}
        <div className="flex flex-wrap items-center gap-1.5">
          {round.status === "DRAFT" && (
            <>
              <button type="button" onClick={onEdit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"><Settings2 className="h-3.5 w-3.5" />Edit</button>
              <button type="button" onClick={() => onRoundAction(round, "open")} disabled={busy || !activityStarted || !round.scheduledStartDateTime || !round.scheduledEndDateTime || !rubricValid} title={!activityStarted ? "Waiting for activity to start." : !round.scheduledStartDateTime || !round.scheduledEndDateTime ? "Set a valid round schedule before opening." : !rubricValid ? "The rubric must be valid and total 100% before opening" : "Open scoring for assigned judges"} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50">
                {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Open
              </button>
            </>
          )}
          {round.status === "OPEN" && <button type="button" onClick={() => onRoundAction(round, "close")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">{busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}Close round</button>}
          {canPublish && <button type="button" onClick={() => onRoundAction(round, "publish")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50">{busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Publish</button>}
          {round.status === "PUBLISHED" && <button type="button" onClick={onViewResults} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"><Eye className="h-3.5 w-3.5" />Results</button>}
          {roundCriteria.length > 0 && <button type="button" onClick={() => setShowCriteria(!showCriteria)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50">{showCriteria ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}Rubric</button>}
          <button type="button" onClick={onToggleAssignments} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50">{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}Judges</button>
        </div>
      </div>

      {/* Status alerts — slim */}
      {round.status === "DRAFT" && !activityStarted && (
        <div className="border-t border-amber-100 bg-amber-50 px-4 py-2">
          <p className="text-xs text-amber-800">⏳ Waiting for activity to start before this round can open.</p>
        </div>
      )}
      {round.status === "DRAFT" && activityStarted && !rubricValid && (
        <div className="border-t border-rose-100 bg-rose-50 px-4 py-2">
          <p className="text-xs text-rose-800">Rubric needs valid criteria with weights totaling 100%.</p>
        </div>
      )}
      {round.status === "OPEN" && (
        <div className="border-t border-indigo-100 bg-indigo-50 px-4 py-2">
          <p className="text-xs text-indigo-800">Scoring is open · rubric is locked.</p>
          {getScheduledTimestamp(round.scheduledEndDateTime) <= currentTime && <p className="mt-0.5 text-xs text-amber-800">⚠ Scheduled end has passed — round remains open until manually closed.</p>}
        </div>
      )}
      {["CLOSED", "PUBLISHED"].includes(round.status) && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
          <p className="text-xs text-slate-500">Rubric is locked · {round.status === "PUBLISHED" ? "results published" : "awaiting publication"}.</p>
        </div>
      )}

      {/* Criteria detail — collapsible */}
      {showCriteria && roundCriteria.length > 0 && (
        <div className="border-t border-slate-100">
          <div className="divide-y divide-slate-50 bg-slate-50/40">
            {roundCriteria.map((criterion, index) => (
              <div key={criterion.id || `${criterion.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800">{criterion.name}</p>
                  {criterion.description && <p className="mt-0.5 truncate text-xs text-slate-500">{criterion.description}</p>}
                </div>
                <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{criterion.maxScore} pts · {criterion.weight}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Judge assignments panel — collapsible */}
      {expanded && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/40 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            <h4 className="text-xs font-semibold text-slate-900">Judges assigned to this round</h4>
          </div>

          {canAssign && (
            <div className="space-y-2">
              <form onSubmit={onAssign} className="flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor={`judge-id-${roundId}`}>Existing judge email</label>
                <input id={`judge-id-${roundId}`} type="email" required className={inputClass} value={judgeId} onChange={(e) => onJudgeIdChange(e.target.value)} placeholder="Existing judge email" />
                <button type="submit" disabled={busyAction === `assign:${roundId}` || !judgeId.trim()} className={primaryButton}><UserPlus className="h-4 w-4" />{busyAction === `assign:${roundId}` ? "Assigning…" : "Assign"}</button>
              </form>
              <form onSubmit={onInvite} className="flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor={`judge-email-${roundId}`}>Judge email</label>
                <input id={`judge-email-${roundId}`} type="email" required className={inputClass} value={judgeEmail} onChange={(e) => onJudgeEmailChange(e.target.value)} placeholder="judge@example.com" />
                <button type="submit" disabled={busyAction === `invite:${roundId}`} className={secondaryButton}><Send className="h-4 w-4" />{busyAction === `invite:${roundId}` ? "Creating…" : "Invite"}</button>
              </form>
            </div>
          )}

          {invitationLink && <p className="break-all rounded-lg border border-indigo-200 bg-indigo-50 p-2.5 text-xs text-indigo-900">Invitation link: <a className="font-semibold underline" href={invitationLink}>{invitationLink}</a></p>}

          {invitations.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Invitation</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{invitations.map((invitation) => <tr key={invitation.id}><td className="px-3 py-2 text-xs font-medium text-slate-800">{invitation.email}</td><td className="px-3 py-2"><StatusBadge status={invitation.status} /></td><td className="px-3 py-2 text-right">{invitation.status === "INVITED" && <button type="button" onClick={() => onRevokeInvitation(invitation)} className={dangerButton}>Revoke</button>}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {assignmentLoading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-slate-500"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Loading assignments…</div>
          ) : assignments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-500">No assignments loaded yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Judge</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{assignments.map((assignment, index) => { const assignmentId = assignment.id || assignment.assignmentId; const active = (assignment.status || "ACTIVE") === "ACTIVE"; return <tr key={assignmentId || assignment.judgeId || index}><td className="px-3 py-2"><p className="text-xs font-semibold text-slate-800">{assignment.judgeName || assignment.name || assignment.judgeEmail || assignment.judgeId || "Judge"}</p>{assignment.judgeEmail && <p className="mt-0.5 text-[10px] text-slate-500">{assignment.judgeEmail}</p>}</td><td className="px-3 py-2"><StatusBadge status={assignment.status || "ACTIVE"} /></td><td className="px-3 py-2 text-right">{active && <button type="button" disabled={busyAction === `revoke:${assignment.judgeId}`} onClick={() => onRevoke(assignment)} className={dangerButton}><X className="h-3 w-3" />Revoke</button>}</td></tr>; })}</tbody>
              </table>
            </div>
          )}

          {round.status === "OPEN" && <p className="text-xs text-amber-700">New assignments are locked while scoring is open. Revoke controls remain available.</p>}
        </div>
      )}

      {/* Inline results view */}
      {selectedResultRound === roundId && result && (
        <div className="border-t border-slate-100 p-4">
          <ResultsView result={result} rankingPolicy={result.rankingPolicy || rankingPolicy || "SEPARATE_BY_ENTRY_TYPE"} />
        </div>
      )}
    </article>
  );
}

function ResultsView({ result, rankingPolicy }) {
  const entries = result.entries || [];
  const hasEntryType = entries.some((entry) => entry.entryType || entry.registrationType);
  const separate = rankingPolicy === "SEPARATE_BY_ENTRY_TYPE" && hasEntryType;
  const groups = separate ? [
    { title: "Individual leaderboard", entries: entries.filter((entry) => (entry.entryType || entry.registrationType) === "INDIVIDUAL") },
    { title: "Team leaderboard", entries: entries.filter((entry) => (entry.entryType || entry.registrationType) === "TEAM") },
  ] : [{ title: "Leaderboard", entries }];
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Published results</h4>
        <p className="mt-0.5 text-xs text-slate-500">Published {formatDateTime(result.publishedAt)}{result.publishedBy ? ` · by ${result.publishedBy}` : ""}</p>
      </div>
      {groups.map((group) => (
        <div key={group.title} className="overflow-hidden rounded-lg border border-slate-200">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">{group.title}</div>
          {group.entries.length === 0 ? (
            <p className="p-3 text-xs text-slate-500">No result entries in this category.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Rank</th><th className="px-3 py-2">Entry</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Score</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{group.entries.map((entry, index) => <tr key={entry.registrationId || index}><td className="px-3 py-2.5 font-bold text-indigo-700">{entry.rank ?? "—"}</td><td className="px-3 py-2.5 font-semibold text-slate-900">{entry.entryName || "Entry"}</td><td className="px-3 py-2.5 text-xs text-slate-500">{(entry.entryType || entry.registrationType) === "TEAM" ? "Team" : (entry.entryType || entry.registrationType) === "INDIVIDUAL" ? "Individual" : "—"}</td><td className="px-3 py-2.5 text-right font-semibold tabular-nums">{entry.totalScore == null ? "—" : Number(entry.totalScore).toFixed(2)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
