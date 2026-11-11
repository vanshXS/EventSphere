import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../../../components/common/AuthLayout";
import FormField from "../../../components/common/FormField";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { acceptCollegeAdminInvitation } from "../authApi";

export default function CollegeAdminAcceptPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const token = params.get("token");
  async function submit(e) {
    e.preventDefault(); setError("");
    if (!token) return setError("The invitation link is missing its token.");
    if (password.length < 8 || password !== confirmation) return setError("Passwords must match and contain at least 8 characters.");
    try {
      setBusy(true);
      await acceptCollegeAdminInvitation({ token, password });
      // Remove the single-use token from browser history after acceptance.
      window.history.replaceState(null, "", "/college-admin/accept");
      setDone(true);
    } catch (err) { setError(err.response?.data?.message || "Unable to accept this invitation."); }
    finally { setBusy(false); }
  }
  return <AuthLayout title="College administrator invitation" subtitle="Set a password to activate your administrator account.">
    {done ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
      <CheckCircle2 aria-hidden="true" className="mx-auto h-8 w-8 text-emerald-600" />
      <h2 className="mt-3 text-base font-bold text-slate-900">Account activated</h2>
      <p className="mt-1 text-sm text-slate-600">Your administrator account is ready.</p>
      <Link className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" to="/login">Sign in</Link>
    </div> : <form onSubmit={submit}>
      {(!token || error) && <p role="alert" className="mb-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />{error || "This invitation link is missing its token. Please use the link from your email."}</p>}
      <FormField id="admin-password" name="password" label="Password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required disabled={busy} />
      <FormField id="admin-password-confirmation" name="confirmation" label="Confirm password" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="Re-enter your password" required disabled={busy} />
      <button type="submit" disabled={busy || !token} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{busy ? "Activating…" : "Accept invitation"}</button>
    </form>}
  </AuthLayout>;
}
