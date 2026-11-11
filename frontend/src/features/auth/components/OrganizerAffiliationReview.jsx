import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, Download, Loader2, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { getOrganizerAffiliationRequests, reviewOrganizerAffiliationRequest, downloadOrganizerAffiliationDocument } from "../authApi";

const statuses = {
  PENDING: { label: "Pending review", icon: Clock, style: "border-amber-200 bg-amber-50 text-amber-700" },
  APPROVED: { label: "Approved", icon: CheckCircle2, style: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejected", icon: XCircle, style: "border-rose-200 bg-rose-50 text-rose-700" },
};

export default function OrganizerAffiliationReview({ collegeId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const load = useCallback(async () => {
    if (!collegeId) return;
    try { setRequests(await getOrganizerAffiliationRequests(collegeId)); setError(""); }
    catch (err) { setError(err.response?.data?.message || "Could not load organizer requests."); }
  }, [collegeId]);
  useEffect(() => {
    if (!collegeId) return;
    let active = true;
    getOrganizerAffiliationRequests(collegeId)
      .then(data => { if (active) { setRequests(data); setError(""); } })
      .catch(err => { if (active) setError(err.response?.data?.message || "Could not load organizer requests."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [collegeId]);
  async function review(id, approved) {
    if (!approved && !reason.trim()) return setError("Enter a reason before rejecting the request.");
    try { setBusy(true); setError(""); await reviewOrganizerAffiliationRequest(id, approved, reason.trim()); setRejecting(null); setReason(""); await load(); }
    catch (err) { setError(err.response?.data?.message || "Review failed."); }
    finally { setBusy(false); }
  }
  async function download(request) {
    try {
      const response = await downloadOrganizerAffiliationDocument(request.id);
      const url = URL.createObjectURL(response.data); const link = document.createElement("a");
      link.href = url; link.download = request.supportingDocument?.originalFilename || "staff-document"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.response?.data?.message || "Document download failed."); }
  }
  return <section aria-labelledby="organizer-review-heading" className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><ShieldCheck aria-hidden="true" className="h-5 w-5" /></div>
      <div><h2 id="organizer-review-heading" className="text-base font-bold text-slate-900">Organizer affiliation requests</h2><p className="mt-1 text-sm text-slate-500">Review organizer details and supporting documents for your college.</p></div>
    </div>
    <div className="space-y-3 p-4 sm:p-5">
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="flex items-center gap-2 py-3 text-sm text-slate-500"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Loading requests…</p> : !requests.length ? <p className="py-3 text-center text-sm text-slate-500">No organizer requests yet.</p> : requests.map(request => {
        const status = statuses[request.status] || { label: request.status || "Unknown", icon: Clock, style: "border-slate-200 bg-slate-50 text-slate-700" };
        const StatusIcon = status.icon;
        return <article key={request.id} className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><UserRound aria-hidden="true" className="h-4 w-4" /></div><div><h3 className="text-sm font-semibold text-slate-900">ID: {request.staffIdentifier}</h3><p className="mt-1 text-sm text-slate-500">{[request.designation, request.department].filter(Boolean).join(" · ") || "No designation or department provided"}</p></div></div>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.style}`}><StatusIcon aria-hidden="true" className="h-3.5 w-3.5" />{status.label}</span>
          </div>
          {request.status === "REJECTED" && request.rejectionReason && <p className="mt-3 text-sm text-slate-600">Reason: {request.rejectionReason}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => download(request)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"><Download aria-hidden="true" className="h-4 w-4" />Document</button>
            {request.status === "PENDING" && <><button disabled={busy} type="button" className="min-h-10 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" onClick={() => review(request.id, true)}>Approve</button><button disabled={busy} type="button" className="min-h-10 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-500" onClick={() => { setRejecting(request.id); setReason(""); setError(""); }}>Reject</button></>}
          </div>
          {rejecting === request.id && request.status === "PENDING" && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/60 p-3"><label className="block text-sm font-medium text-slate-700">Reason for rejection<textarea required rows="2" value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain what needs to be corrected" className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" /></label><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy || !reason.trim()} onClick={() => review(request.id, false)} className="min-h-10 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">Confirm rejection</button><button type="button" disabled={busy} onClick={() => { setRejecting(null); setError(""); }} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button></div></div>}
        </article>;
      })}
    </div>
  </section>;
}
