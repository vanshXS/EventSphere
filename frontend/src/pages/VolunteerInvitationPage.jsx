import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  acceptStaffInvitation,
  getStaffInvitation
} from "../features/attendance/attendanceApi";

export default function VolunteerInvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState(null);
  const [form, setForm] = useState({ name: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    getStaffInvitation(token)
      .then((data) => {
        setInvitation(data);
        setForm((current) => ({
          ...current,
          name: data.invitedName || ""
        }));
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            "This invitation is invalid or expired."
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  const accept = async (event) => {
    event.preventDefault();

    try {
      setAccepting(true);
      setError("");

      await acceptStaffInvitation(token, {
        name: form.name,
        password: invitation?.accountExists ? null : form.password
      });
      setDone(true);

      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not accept this invitation."
      );
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        {done ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Volunteer account ready
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Your check-in access is active. Redirecting you to login...
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Volunteer Invitation
                </h1>
                <p className="text-sm text-slate-500">
                  {invitation?.eventName ||
                    invitation?.activityName ||
                    "EventSphere"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                You are being invited as a{" "}
                <span className="font-semibold text-slate-800">
                  Check-in Volunteer
                </span>
                .
              </p>
              {invitation?.accountExists && (
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  This email already has an EventSphere account. Accepting this
                  invitation adds the new check-in assignment to that account.
                  You do not need to create another password.
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                This link expires{" "}
                {invitation?.invitationExpiresAt
                  ? new Date(invitation.invitationExpiresAt).toLocaleString()
                  : "soon"}
                .
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {error}
              </div>
            )}

            <form onSubmit={accept} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">
                  Your name
                </span>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              {!invitation?.accountExists && (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-700">
                    Create password
                  </span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="At least 8 characters"
                  />
                </label>
              )}

              <button
                type="submit"
                disabled={accepting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {accepting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {invitation?.accountExists
                  ? "Accept Volunteer Access"
                  : "Create Volunteer Account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
