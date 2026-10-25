
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, Mail, RefreshCw, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getEventById } from "../features/events/eventApi";
import {
  getEventStaff,
  inviteEventStaff,
  revokeStaff
} from "../features/attendance/attendanceApi";
import { useToast } from "../components/common/ToastContext";

export default function EventVolunteersPage() {
  const { eventId } = useParams();
  const addToast = useToast();
  const [event, setEvent] = useState(null);
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setError = useCallback((message) => {
    if (message) addToast(message, "error");
  }, [addToast]);
  const setSuccess = useCallback((message) => {
    if (message) addToast(message, "success");
  }, [addToast]);
  const [copied, setCopied] = useState("");
  // Cache invitation links from POST responses so they survive page reload
  const savedLinksRef = useRef({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [eventData, staffData] = await Promise.all([
        getEventById(eventId),
        getEventStaff(eventId)
      ]);
      setEvent(eventData);
      // Merge saved invitation links back into staff data from GET
      const mergedStaff = staffData.map((s) => ({
        ...s,
        invitationLink: s.invitationLink || savedLinksRef.current[s.id] || null
      }));
      setStaff(mergedStaff);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load event volunteers."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId, setError]);

  useEffect(() => {
    load();
  }, [load]);

  const invite = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const created = await inviteEventStaff(eventId, {
        name: name.trim() || null,
        email: email.trim()
      });
      // Persist the invitation link so it survives page navigation
      if (created.invitationLink) {
        savedLinksRef.current[created.id] = created.invitationLink;
      }
      setStaff((previous) => [created, ...previous]);
      setName("");
      setEmail("");
      setSuccess("Invitation created. Share the link with the volunteer.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not create the invitation."
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
        err.response?.data?.message || "Could not revoke volunteer access."
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
          to={"/organizer/events/" + eventId + "/operations"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to event operations
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Volunteer Management
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {event?.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Event entry volunteers can scan tickets for this event's main gate.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              to={"/organizer/events/" + eventId + "/volunteers"}
              className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"
            >
              <p className="text-sm font-bold text-indigo-800">Event entry</p>
              <p className="mt-1 text-xs text-indigo-700">
                Volunteers who can scan event-entry tickets.
              </p>
            </Link>
            <Link
              to={"/organizer/events/" + eventId + "/activity-volunteers"}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-white"
            >
              <p className="text-sm font-bold text-slate-800">
                Activity volunteers
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Assign volunteers to one specific activity.
              </p>
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={invite}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Add event-entry volunteer
              </h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Use their email. Existing EventSphere users keep the same account.
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
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {saving ? "Creating..." : "Invite volunteer"}
              </button>
            </div>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Event-entry volunteers
                </h2>
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
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {staff.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  No event-entry volunteers yet.
                </p>
              ) : (
                staff.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {item.invitedName || item.email}
                        </p>
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
                        <p className="break-all text-[11px] text-slate-600 font-mono bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
                          {item.invitationLink}
                        </p>
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
