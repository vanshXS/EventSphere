
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, Mail, RefreshCw, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getStandaloneActivity } from "../features/activities/activityApi";
import {
  getActivityStaff,
  inviteActivityStaff,
  revokeStaff
} from "../features/attendance/attendanceApi";

export default function StandaloneActivityVolunteersPage() {
  const { activityId } = useParams();
  const [activity, setActivity] = useState(null);
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState("");
  const savedLinksRef = useRef({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [activityData, staffData] = await Promise.all([
        getStandaloneActivity(activityId),
        getActivityStaff(activityId)
      ]);
      setActivity(activityData);
      setStaff(staffData.map((s) => ({
        ...s,
        invitationLink: s.invitationLink || savedLinksRef.current[s.id] || null
      })));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load activity volunteers."
      );
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    load();
  }, [load]);

  const invite = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      const created = await inviteActivityStaff(activityId, {
        name: name.trim() || null,
        email: email.trim()
      });
      if (created.invitationLink) {
        savedLinksRef.current[created.id] = created.invitationLink;
      }
      setStaff((previous) => [created, ...previous]);
      setName("");
      setEmail("");
      setSuccess("Invitation created. Share the link with the volunteer.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create the invitation."
      );
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (assignmentId) => {
    try {
      await revokeStaff(assignmentId);
      setStaff((previous) =>
        previous.map((item) =>
          item.id === assignmentId ? { ...item, status: "REVOKED" } : item
        )
      );
      setSuccess("Volunteer access revoked.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not revoke access."
      );
    }
  };

  const copy = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(link);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setError("Could not copy the invitation link.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <RefreshCw className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          to={"/organizer/activities/" + activityId + "/operations"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to activity operations
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Activity volunteer management
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {activity?.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            These volunteers can scan only tickets issued for this activity.
          </p>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div>
        )}

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={invite} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Add volunteer</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Existing EventSphere users keep their existing account.
            </p>

            <div className="mt-5 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Volunteer name (optional)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="volunteer@email.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <button
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {saving ? "Creating..." : "Invite volunteer"}
              </button>
            </div>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Assigned volunteers</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {staff.filter((item) => item.status === "ACTIVE").length} active
                  {" · "}
                  {staff.filter((item) => item.status === "INVITED").length} invited
                </p>
              </div>
              <button
                type="button"
                onClick={load}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {staff.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  No volunteers assigned yet.
                </p>
              ) : (
                staff.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.invitedName || item.email}</p>
                        <p className="text-xs text-slate-500">{item.email}</p>
                        <span className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                          {item.status}
                        </span>
                      </div>
                      {item.status !== "REVOKED" && (
                        <button
                          type="button"
                          onClick={() => revoke(item.id)}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                          title="Revoke access"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {item.status === "INVITED" && item.invitationLink && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Registration Link</p>
                        <p className="break-all text-[11px] text-slate-600 font-mono bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">{item.invitationLink}</p>
                        <button
                          type="button"
                          onClick={() => copy(item.invitationLink)}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copied === item.invitationLink ? "Copied!" : "Copy link"}
                        </button>
                      </div>
                    )}
                    {item.status === "INVITED" && !item.invitationLink && (
                      <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                        <p className="text-[11px] text-amber-700">
                          Registration link was shown when created. Invite again to get a new link.
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
