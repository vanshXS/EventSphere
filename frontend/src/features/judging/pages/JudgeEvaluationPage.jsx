import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronLeft, Info, Save, Send, ShieldCheck, Users } from "lucide-react";
import JudgeWorkspaceLayout from "../components/JudgeWorkspaceLayout";
import { EmptyState, ErrorNotice, LoadingState, StatusBadge, SuccessNotice, inputClass, labelClass, primaryButton, secondaryButton } from "../components/JudgingUi";
import { getApiErrorMessage, getEligibleRegistrations, getMyAssignedRounds, getMyEvaluation, saveEvaluationDraft, submitEvaluation } from "../api/judgingApi";
import { getCriteriaId, getEntryType, getScoreNumber } from "../utils/judgingFormatter";

export default function JudgeEvaluationPage() {
  const { roundId, registrationId } = useParams();
  const [round, setRound] = useState(null);
  const [entry, setEntry] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [entryPosition, setEntryPosition] = useState({ previousId: null, nextId: null, index: 0, total: 0 });
  const scoreInputRefs = useRef([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rounds, registrations] = await Promise.all([getMyAssignedRounds(), getEligibleRegistrations(roundId)]);
      const matchedRound = rounds.find((item) => item.roundId === roundId);
      const matchedEntry = registrations.find((item) => item.registrationId === registrationId);
      if (!matchedRound) throw new Error("This judging round is not assigned to your account.");
      if (!matchedEntry) throw new Error("This registration is not eligible for this judging round.");
      const entryIndex = registrations.findIndex((item) => item.registrationId === registrationId);
      setEntryPosition({
        previousId: registrations[entryIndex - 1]?.registrationId || null,
        nextId: registrations[entryIndex + 1]?.registrationId || null,
        index: entryIndex + 1,
        total: registrations.length
      });
      setRound(matchedRound);
      setEntry(matchedEntry);

      let saved = null;
      try {
        saved = await getMyEvaluation(roundId, registrationId);
      } catch (evaluationError) {
        if (evaluationError.response?.status !== 404) throw evaluationError;
      }
      setEvaluation(saved);
      setFeedback(saved?.feedback || "");
      const scoreMap = {};
      (saved?.scores || []).forEach((score) => {
        const id = score.criterionId || score.id;
        if (id) scoreMap[id] = { score: score.score ?? "", comment: score.comment || "" };
      });
      setScores(scoreMap);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load this evaluation."));
    } finally {
      setLoading(false);
    }
  }, [roundId, registrationId]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const criteria = useMemo(() => round?.criteria || [], [round?.criteria]);
  const submitted = evaluation?.status === "SUBMITTED";
  const roundOpen = round?.status === "OPEN";
  const readOnly = submitted || !roundOpen;

  const scoreSummary = useMemo(() => {
    let total = 0;
    let filled = 0;
    for (const criterion of criteria) {
      const id = getCriteriaId(criterion);
      const score = getScoreNumber(scores[id]?.score);
      if (score === null) continue;
      filled += 1;
      const max = Number(criterion.maxScore);
      const weight = Number(criterion.weight);
      if (max > 0 && Number.isFinite(weight)) total += (score / max) * weight;
    }
    return { total: total.toFixed(2), filled, count: criteria.length, complete: criteria.length > 0 && filled === criteria.length };
  }, [criteria, scores]);

  const updateCriterion = (id, field, value) => {
    setScores((previous) => ({ ...previous, [id]: { score: previous[id]?.score ?? "", comment: previous[id]?.comment ?? "", [field]: value } }));
    setError("");
    setSuccess("");
  };

  const buildPayload = () => ({
    score: criteria.map((criterion) => {
      const id = getCriteriaId(criterion);
      const value = scores[id] || {};
      return { criteriaId: id, score: getScoreNumber(value.score), comment: value.comment?.trim() || null };
    }).filter((item) => item.score !== null),
    feedback: feedback.trim() || null,
  });

  const validateForSubmit = () => {
    if (!criteria.length) return "This round has no scoring criteria. Contact the organizer.";
    for (const criterion of criteria) {
      const id = getCriteriaId(criterion);
      const score = getScoreNumber(scores[id]?.score);
      if (score === null) return `Enter a score for “${criterion.name || "every criterion"}” before submitting.`;
      const max = Number(criterion.maxScore);
      if (score < 0 || score > max) return `Score for “${criterion.name}” must be between 0 and ${max}.`;
    }
    return "";
  };

  const handleSaveDraft = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const saved = await saveEvaluationDraft(roundId, registrationId, buildPayload());
      setEvaluation(saved);
      setFeedback(saved?.feedback ?? feedback);
      setSuccess("Draft saved. You can return to this evaluation while the round is open.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save your draft."));
    } finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    const validation = validateForSubmit();
    if (validation) { setError(validation); return; }
    if (!window.confirm("Submit this evaluation? Once submitted, it is locked unless the organizer authorizes a correction.")) return;
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const saved = await submitEvaluation(roundId, registrationId, buildPayload());
      setEvaluation(saved);
      setSuccess("Evaluation submitted successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not submit this evaluation."));
    } finally { setSubmitting(false); }
  };

  return (
    <JudgeWorkspaceLayout title="Entry evaluation">
      {loading ? <LoadingState label="Loading rubric and your saved evaluation…" /> : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex min-w-0 items-start gap-3">
            <Link to={`/judge/rounds/${roundId}`} aria-label="Back to round entries" className="mt-1 rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-indigo-700">{round?.activityName || "Activity"} <span className="mx-1 text-slate-300">/</span> {round?.roundName || "Round"}</p>
              <h1 className="mt-1 break-words text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{entry?.entryName || entry?.participantName || "Entry evaluation"}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500">{getEntryType(entry) === "TEAM" ? "Team entry" : "Individual entry"}</span><StatusBadge status={evaluation?.status || "NOT_STARTED"} className="!px-2 !py-0.5 !text-[10px]" /><StatusBadge status={round?.status} className="!px-2 !py-0.5 !text-[10px]" /></div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs text-slate-500 sm:inline">{entryPosition.index} of {entryPosition.total}</span>
            {entryPosition.previousId && <Link to={`/judge/rounds/${roundId}/entries/${entryPosition.previousId}`} aria-label="Previous entry" title="Previous entry" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></Link>}
            {entryPosition.nextId && <Link to={`/judge/rounds/${roundId}/entries/${entryPosition.nextId}`} aria-label="Next entry" title="Next entry" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Next entry <ArrowRight className="h-3.5 w-3.5" /></Link>}
          </div>
          </div>

          <ErrorNotice message={error} onDismiss={() => setError("")} />
          <SuccessNotice message={success} />
          {!roundOpen && !submitted && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" /><p>This round is not open for scoring. You can review any existing draft, but cannot save or submit it now.</p></div>}
          {submitted && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>This evaluation has been submitted and is locked. Contact the organizer if a correction is genuinely required.</p></div>}

          {!round || !entry ? <EmptyState title="Evaluation unavailable" description="The round or registration could not be loaded for your account. Return to the assigned rounds list or contact the organizer." /> : <div className="pb-24">
            {entry?.roster?.length > 0 && <section className="mb-5 border-l-2 border-slate-300 pl-3"><div className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 text-slate-500" /><div className="min-w-0"><h2 className="text-xs font-bold text-slate-800">Team roster <span className="font-normal text-slate-500">at registration</span></h2><div className="mt-2 flex flex-wrap gap-1.5">{entry.roster.map((member, index) => <span key={member.participantId || index} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">{member.participantName || member.participantId || `Member ${index + 1}`}{member.teamLeader && <span className="rounded bg-indigo-100 px-1 text-[9px] font-bold text-indigo-700">Leader</span>}</span>)}</div></div></div></section>}
            {entry?.rosterSnapshotAvailable === false && <div className="mb-4 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">{entry.rosterNote || "The historical team roster snapshot is unavailable for this registration."}</div>}
            <section>
                <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-3">
                  <div><h2 className="text-sm font-bold text-slate-900">Scoring rubric</h2><p className="mt-0.5 text-xs text-slate-500">Enter a score for each criterion. Weights calculate a total out of 100.</p></div>
                  <p className="text-xs font-semibold text-slate-600">{scoreSummary.filled}/{scoreSummary.count} scored <span className="mx-1 text-slate-300">·</span> {scoreSummary.complete ? `${scoreSummary.total}/100` : "Total pending"}</p>
                </div>
                <div className="divide-y divide-slate-200">
                  {criteria.map((criterion, index) => {
                    const id = getCriteriaId(criterion);
                    const current = scores[id] || {};
                    const max = Number(criterion.maxScore || 0);
                    return <div key={id || index} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-start">
                      <div className="min-w-0">
                        <div className="flex items-start gap-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-600">{index + 1}</span><div><h3 className="text-sm font-semibold text-slate-900">{criterion.name || `Criterion ${index + 1}`} <span className="ml-1 text-xs font-medium text-slate-400">{criterion.weight}%</span></h3>{criterion.description && <p className="mt-1 text-xs leading-5 text-slate-600">{criterion.description}</p>}</div></div>
                        <details className="group mt-2" defaultOpen={Boolean(current.comment)}>
                          <summary className="w-fit cursor-pointer list-none text-[11px] font-semibold text-indigo-700 hover:text-indigo-900">{current.comment ? "Hide note" : "Add note"} <span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span></summary>
                          <textarea id={`comment-${id}`} rows={2} maxLength={1000} disabled={readOnly} value={current.comment || ""} onChange={(e) => updateCriterion(id, "comment", e.target.value)} className={`${inputClass} mt-2 resize-y text-xs`} placeholder="Optional notes for this criterion." />
                        </details>
                      </div>
                      <div><label className="mb-1 block text-[11px] font-semibold text-slate-600" htmlFor={`score-${id}`}>Score <span className="font-normal text-slate-400">/ {max}</span></label><input ref={(element) => { scoreInputRefs.current[index] = element; }} id={`score-${id}`} type="number" inputMode="decimal" min="0" max={max} step="0.01" disabled={readOnly} value={current.score ?? ""} onChange={(e) => updateCriterion(id, "score", e.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); (scoreInputRefs.current[index + 1] || document.getElementById("overall-feedback"))?.focus(); } }} className={`${inputClass} py-2 text-base font-semibold tabular-nums`} placeholder={`0–${max}`} aria-label={`Score for ${criterion.name || `criterion ${index + 1}`} out of ${max}`} />
                      </div>
                    </div>;
                  })}
                  {!criteria.length && <div className="py-6 text-sm text-slate-600">No rubric criteria were returned for this round. Ask the organizer to configure the rubric.</div>}
                </div>
            </section>

              <section className="mt-5 border-t border-slate-200 pt-4">
                <label className={labelClass} htmlFor="overall-feedback">Overall feedback <span className="font-normal text-slate-400">(optional)</span></label>
                <textarea id="overall-feedback" rows={3} maxLength={3000} disabled={readOnly} value={feedback} onChange={(e) => { setFeedback(e.target.value); setError(""); }} className={`${inputClass} resize-y`} placeholder="Optional feedback for this entry." />
                <p className="mt-1 text-right text-xs text-slate-400">{feedback.length}/3000</p>
              </section>
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur sm:px-6">
              <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
                <div className="min-w-36 flex-1 sm:flex-none">
                  <div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-slate-700">{scoreSummary.filled}/{scoreSummary.count} criteria</span><span className="font-bold tabular-nums text-slate-900">{scoreSummary.complete ? `${scoreSummary.total}/100` : "In progress"}</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${criteria.length ? (scoreSummary.filled / criteria.length) * 100 : 0}%` }} /></div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleSaveDraft} disabled={readOnly || saving || submitting || !criteria.length} className={`${secondaryButton} px-3 py-2 text-xs`}>{saving ? "Saving…" : <><Save className="h-3.5 w-3.5" />Save draft</>}</button>
                  <button type="button" onClick={handleSubmit} disabled={readOnly || saving || submitting || !criteria.length} className={`${primaryButton} px-3 py-2 text-xs`}>{submitting ? "Submitting…" : <><Send className="h-3.5 w-3.5" />Submit</>}</button>
                </div>
              </div>
            </div>
          </div>}
        </>
      )}
    </JudgeWorkspaceLayout>
  );
}
