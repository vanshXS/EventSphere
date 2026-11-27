import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Award, CheckCircle2, FileCheck2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { getJudgingRounds } from "../judging/api/judgingApi";
import { generateCertificate, getCertificatePreview } from "./certificateApi";

const selectClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
const readable = (value) => (value || "").toLowerCase().replaceAll("_", " ");
const messageOf = (error) => error?.response?.data?.message || error?.message || "Something went wrong. Please try again.";

export default function OrganizerCertificates({ eventId, activityId, activities = [] }) {
  const requestRef = useRef(0);
  const [target, setTarget] = useState(activityId ? `activity:${activityId}` : `event:${eventId}`);
  const [type, setType] = useState("PARTICIPATION");
  const [roundId, setRoundId] = useState("");
  const [rounds, setRounds] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [confirmFinal, setConfirmFinal] = useState(false);
  const [scopeType, id] = target.split(":");
  const scope = scopeType === "event" ? "events" : "activities";

  useEffect(() => {
    let alive = true;
    setRoundId(""); setRounds([]); setPreview(null); setConfirmFinal(false); setError(""); setSummary("");
    if (scope === "events") { setType("PARTICIPATION"); return () => { alive = false; }; }
    getJudgingRounds(id).then((rows) => { if (alive) setRounds(rows.filter((r) => r.status === "PUBLISHED")); }).catch(() => { if (alive) setRounds([]); });
    return () => { alive = false; };
  }, [scope, id]);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (type === "WINNER" && !roundId) { setPreview(null); setLoading(false); return; }
    setLoading(true); setPreview(null); setError("");
    try { const result = await getCertificatePreview(scope, id, type, roundId); if (requestId === requestRef.current) setPreview(result); }
    catch (e) { if (requestId === requestRef.current) { setPreview(null); setError(messageOf(e)); } }
    finally { if (requestId === requestRef.current) setLoading(false); }
  }, [scope, id, type, roundId]);
  useEffect(() => { load(); return () => { requestRef.current += 1; }; }, [load]);

  const candidates = preview?.candidates || [];
  const eligible = useMemo(() => candidates.filter((c) => c.eligible && c.certificateStatus !== "ISSUED" && c.certificateStatus !== "REVOKED"), [candidates]);
  const issued = candidates.filter((c) => c.certificateStatus === "ISSUED").length;
  const generateAll = async () => {
    if (!eligible.length || busy) return;
    setBusy(true); setSummary(""); setError(""); let success = 0; const failures = [];
    for (const [index, item] of eligible.entries()) {
      setProgress(`Processing ${index + 1} of ${eligible.length}`);
      try {
        const result = await generateCertificate(scope, id, { type, registrationId: item.registrationId, participantId: item.participantId, ...(type === "WINNER" ? { roundId } : {}) });
        if (result.status === "ISSUED") success += 1; else failures.push(`${item.name}: not issued`);
      } catch (e) { failures.push(`${item.name}: ${messageOf(e)}`); }
    }
    setSummary(`${success} issued or already issued. ${failures.length} could not be completed.${failures.length ? ` ${failures.slice(0, 3).join("; ")}${failures.length > 3 ? "; see refreshed list for the rest." : ""}` : ""}`);
    setProgress(""); setBusy(false); await load();
  };
  return <section className="space-y-5 py-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><Award className="h-5 w-5 text-indigo-600" /><h2 className="text-xl font-bold text-slate-900">Certificates</h2></div><p className="mt-1 text-sm text-slate-500">Review eligibility before issuing certificates. Each recipient receives their own PDF.</p></div>
      <button type="button" onClick={load} disabled={loading || busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh</button>
    </div>
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">
        {!activityId && <label className="space-y-1.5 text-sm font-semibold text-slate-700">Event or activity<select className={selectClass} value={target} disabled={busy} onChange={(e) => setTarget(e.target.value)}><option value={`event:${eventId}`}>Event participation</option>{activities.map((a) => <option key={a.id || a.activityId} value={`activity:${a.id || a.activityId}`}>{a.name}</option>)}</select></label>}
        {scope === "activities" && <label className="space-y-1.5 text-sm font-semibold text-slate-700">Certificate type<select className={selectClass} value={type} disabled={busy} onChange={(e) => { setType(e.target.value); setPreview(null); setConfirmFinal(false); setError(""); }}><option value="PARTICIPATION">Participation</option><option value="WINNER">Winner</option></select></label>}
        {scope === "activities" && type === "WINNER" && <label className="space-y-1.5 text-sm font-semibold text-slate-700">Final published round<select className={selectClass} value={roundId} disabled={busy} onChange={(e) => { setRoundId(e.target.value); setConfirmFinal(false); }}><option value="">Select the final round</option>{rounds.map((r) => <option key={r.id || r.roundId} value={r.id || r.roundId}>{r.name || r.roundName || `Round ${r.sequence}`}</option>)}</select></label>}
      </div>
      {type === "WINNER" && <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900"><p>The selected published round is used for ranks 1–3, including ties. Once issuance begins, it cannot be changed here.</p><label className="mt-2 flex items-start gap-2 font-medium"><input type="checkbox" checked={confirmFinal} onChange={(e) => setConfirmFinal(e.target.checked)} disabled={busy} className="mt-1 accent-indigo-600" />I confirm this is the final round.</label></div>}
      {type === "WINNER" && !rounds.length && <p className="mt-3 text-sm text-slate-500">No published rounds found. Publish judging results first.</p>}
    </div>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {summary && <div role="status" className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">{summary}</div>}
    {loading ? <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Checking eligibility...</div> : preview && <>
      {preview.missingTeamSnapshots > 0 && <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><ShieldAlert className="h-4 w-4 shrink-0" />{preview.missingTeamSnapshots} team registration(s) have no saved member snapshot and require manual review.</div>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Eligible to issue</div><div className="mt-1 text-2xl font-bold text-slate-900">{eligible.length}</div></div><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Already issued</div><div className="mt-1 text-2xl font-bold text-emerald-700">{issued}</div></div><div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 sm:col-span-1"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{scope === "events" ? "Event status" : "Activity status"}</div><div className="mt-1 text-sm font-semibold capitalize text-slate-800">{readable(preview.status)}</div></div></div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h3 className="font-bold text-slate-900">Recipient review</h3><p className="mt-1 text-sm text-slate-500">{candidates.length} participant{candidates.length === 1 ? "" : "s"} checked</p></div><button type="button" onClick={generateAll} disabled={!eligible.length || busy || (type === "WINNER" && !confirmFinal)} className={buttonClass}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}{busy ? progress : "Generate eligible"}</button></div>
        {candidates.length === 0 ? <div className="px-5 py-12 text-center text-sm text-slate-500">No registrations to review yet.</div> : <ul className="divide-y divide-slate-100">{candidates.map((c) => <li key={`${c.registrationId}:${c.participantId}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-800">{c.name}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{c.eligible ? "Attendance verified" : readable(c.reason)}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${c.certificateStatus === "ISSUED" ? "bg-emerald-50 text-emerald-700" : c.eligible ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>{c.certificateStatus === "ISSUED" && <CheckCircle2 className="h-3 w-3" />}{c.certificateStatus ? readable(c.certificateStatus) : c.eligible ? "Eligible" : "Not eligible"}</span></li>)}</ul>}
      </div>
    </>}
  </section>;
}
