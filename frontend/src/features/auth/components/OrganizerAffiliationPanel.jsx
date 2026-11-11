import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, FileUp, Loader2, ShieldCheck, X } from "lucide-react";
import { getMyOrganizerAffiliation, submitOrganizerAffiliationRequest } from "../authApi";
import { useAuth } from "../AuthContext";

const states = {
  UNVERIFIED: { title: "Verify your college affiliation", description: "Approval is needed to publish college-only events. You can still create drafts.", label: "Not verified", icon: ShieldCheck, iconClass: "bg-indigo-50 text-indigo-600", badgeClass: "bg-slate-100 text-slate-700" },
  PENDING: { title: "Verification under review", description: "Your college admin is reviewing your request. You can still create drafts.", label: "Pending review", icon: Clock3, iconClass: "bg-amber-50 text-amber-700", badgeClass: "bg-amber-50 text-amber-800" },
  VERIFIED: { title: "College affiliation verified", description: "You can publish college-only events and activities.", label: "Verified", icon: CheckCircle2, iconClass: "bg-emerald-50 text-emerald-700", badgeClass: "bg-emerald-50 text-emerald-800" },
  REJECTED: { title: "Verification needs attention", description: "Your college admin could not approve your request. Review the reason and resubmit.", label: "Not approved", icon: AlertCircle, iconClass: "bg-rose-50 text-rose-700", badgeClass: "bg-rose-50 text-rose-800" },
};
const inputClass = "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export default function OrganizerAffiliationPanel() {
  const { user, updateUser, refreshUser } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [staffIdentifier, setStaffIdentifier] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [document, setDocument] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    let active = true;
    getMyOrganizerAffiliation()
      .then((data) => { if (active) setRequest(data); })
      .catch(() => { if (active) setStatusError("Could not load your latest request. Refresh the page to try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    dialog.showModal();
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    dialog.querySelector("input")?.focus();
    return () => {
      if (dialog.open) dialog.close();
      window.document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const status = user?.organizerAffiliationStatus || request?.status || "UNVERIFIED";
  const display = states[status] || states.UNVERIFIED;
  const StatusIcon = display.icon;
  const canSubmit = status === "UNVERIFIED" || status === "REJECTED";

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!document) { setError("Please attach a supporting document."); return; }
    try {
      setBusy(true);
      const data = await submitOrganizerAffiliationRequest({ staffIdentifier: staffIdentifier.trim(), department: department.trim(), designation: designation.trim(), document });
      setRequest(data);
      updateUser({ organizerAffiliationStatus: "PENDING" });
      setIsOpen(false);
      setDocument(null); setStaffIdentifier(""); setDepartment(""); setDesignation("");
      event.target.reset();
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit your request. Please try again.");
    } finally { setBusy(false); }
  }

  return <>
    <section aria-label="Organizer affiliation status" className="rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${display.iconClass}`}><StatusIcon aria-hidden="true" className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-slate-900">{display.title}</h2>{!loading && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${display.badgeClass}`}>{display.label}</span>}</div>
            <p className="mt-1 text-sm leading-5 text-slate-600">{loading ? "Checking your verification status…" : display.description}</p>
            {!loading && status === "REJECTED" && <p className="mt-1 text-sm text-rose-700">Reason: {request?.rejectionReason || "Contact your college administrator."}</p>}
            {statusError && <p role="alert" className="mt-1 text-sm text-rose-700">{statusError}</p>}
          </div>
        </div>
        {!loading && canSubmit && <button type="button" onClick={() => { setError(""); setIsOpen(true); }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">{status === "REJECTED" ? "Review and resubmit" : "Verify affiliation"}<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>}
      </div>
    </section>
    <dialog ref={dialogRef} onCancel={(event) => { if (busy) event.preventDefault(); }} onClose={() => setIsOpen(false)} aria-labelledby="organizer-verification-title" aria-describedby="organizer-verification-description" className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50">
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><ShieldCheck aria-hidden="true" className="h-5 w-5" /></div><div><h2 id="organizer-verification-title" className="text-base font-semibold text-slate-900">Verify college affiliation</h2><p id="organizer-verification-description" className="mt-1 text-sm leading-5 text-slate-600">Submit your details for review by {user?.collegeName ? `${user.collegeName}'s college admin` : "your college admin"}.</p></div></div>
          <button type="button" aria-label="Close verification form" disabled={busy} onClick={() => setIsOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"><X aria-hidden="true" className="h-5 w-5" /></button>
        </header>
        <form onSubmit={submit} className="overflow-y-auto">
          <div className="space-y-4 px-5 py-5 sm:px-6">
            {status === "REJECTED" && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Previous reason: {request?.rejectionReason || "Contact your college administrator."}</p>}
            <p className="text-sm leading-5 text-slate-600">Your admin will review your details before you can publish college-only events. Fields marked * are required.</p>
            <label className="block text-sm font-medium text-slate-700">Staff / employee ID <span className="text-rose-700">*</span><input required value={staffIdentifier} onChange={(event) => setStaffIdentifier(event.target.value)} placeholder="Enter your ID" className={inputClass} /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Department <span className="font-normal text-slate-500">(optional)</span><input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="e.g. Computer Science" className={inputClass} /></label><label className="block text-sm font-medium text-slate-700">Designation <span className="font-normal text-slate-500">(optional)</span><input value={designation} onChange={(event) => setDesignation(event.target.value)} placeholder="e.g. Coordinator" className={inputClass} /></label></div>
            <label className="block text-sm font-medium text-slate-700">Supporting document <span className="text-rose-700">*</span><span className="mt-1.5 flex items-start gap-2 text-sm font-normal text-slate-600"><FileUp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />Upload a document supporting your affiliation (PDF, JPG, or PNG).</span><input required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setDocument(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></label>
            {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          </div>
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6"><button type="button" disabled={busy} onClick={() => setIsOpen(false)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">Cancel</button><button type="submit" disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">{busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{busy ? "Submitting…" : "Submit for review"}</button></footer>
        </form>
      </div>
    </dialog>
  </>;
}
