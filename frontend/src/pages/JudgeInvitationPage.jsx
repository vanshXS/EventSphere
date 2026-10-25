import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Trophy, UserPlus, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getJudgeInvitation, acceptJudgeInvitation } from "../features/judging/api/judgingApi";

export default function JudgeInvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState(null);
  const [form, setForm] = useState({ name: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let ignore = false;
    getJudgeInvitation(token)
      .then((data) => {
        if (!ignore) {
          setInvitation(data);
          setForm((current) => ({
            ...current,
            name: data.invitedName || ""
          }));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err.response?.data?.message ||
              "This judge invitation is invalid or has expired."
          );
          setLoading(false);
        }
      });


    return () => {
      ignore = true;
    };
  }, [token]);

  const accept = async (event) => {
    event.preventDefault();

    try {
      setAccepting(true);
      setError("");

      await acceptJudgeInvitation(token, {
        name: form.name,
        password: invitation?.accountExists ? null : form.password
      });
      setDone(true);

      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not accept this invitation. Please try again."
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
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm text-left">
        {done ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Judge account ready
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Your judging evaluation access is active. Redirecting you to login...
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Judge Invitation
                </h1>
                <p className="text-sm text-slate-500">
                  {invitation?.roundName
                    ? `${invitation.roundName} • ${invitation.activityName || "Competition"}`
                    : invitation?.activityName || invitation?.eventName || "EventSphere Judging"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
              <p>
                You are invited as an official{" "}
                <span className="font-semibold text-slate-800">
                  Competition Judge
                </span>{" "}
                for{" "}
                <span className="font-semibold text-slate-800">
                  {invitation?.activityName || "the event"}
                </span>
                {invitation?.roundName && (
                  <> ({invitation.roundName})</>
                )}
                .
              </p>

              {invitation?.accountExists && (
                <p className="text-xs leading-relaxed text-indigo-700 bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-100">
                  <span className="font-semibold">Existing Account Detected:</span> This email already has an active EventSphere account. Accepting this invitation will assign the judging round to your account without needing a new password.
                </p>
              )}

              <p className="text-xs text-slate-500 pt-1">
                Invitation valid until{" "}
                {invitation?.invitationExpiresAt
                  ? new Date(invitation.invitationExpiresAt).toLocaleString()
                  : "7 days from issue"}
                .
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            <form onSubmit={accept} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">
                  Your Full Name
                </span>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  placeholder="e.g. Dr. Alex Morgan"
                />
              </label>

              {!invitation?.accountExists && (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-700">
                    Create Password
                  </span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    placeholder="At least 8 characters"
                  />
                </label>
              )}

              <button
                type="submit"
                disabled={accepting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors cursor-pointer shadow-xs"
              >
                {accepting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                <span>
                  {invitation?.accountExists
                    ? "Accept Judge Assignment"
                    : "Create Judge Account & Accept"}
                </span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
