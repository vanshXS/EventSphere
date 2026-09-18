import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ClipboardCheck,
  Mail,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus
} from "lucide-react";
import {
  getEventStaff,
  getEventAttendance,
  inviteEventStaff,
  inviteActivityStaff,
  revokeStaff,
  getActivityAttendance
} from "../features/attendance/attendanceApi";
import { getEventById } from "../features/events/eventApi";
import { getActivitiesByEvent } from "../features/activities/activityApi";

export default function EventOperationsPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activityAttendance, setActivityAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [saving, setSaving] = useState(false);
  const [activityInvite, setActivityInvite] = useState(null);
  const [activityEmail, setActivityEmail] = useState("");
  const [activityName, setActivityName] = useState("");
  const [activitySaving, setActivitySaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [eventData, activityData, staffData, attendanceData] =
        await Promise.all([
          getEventById(eventId),
          getActivitiesByEvent(eventId),
          getEventStaff(eventId),
          getEventAttendance(eventId)
        ]);
      setEvent(eventData);
      setActivities(activityData);
      setStaff(staffData);
      setAttendance(attendanceData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load event operations."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeStaff = staff.filter((item) => item.status === "ACTIVE");
  const invitedStaff = staff.filter((item) => item.status === "INVITED");

  const checkedInActivityIds = useMemo(
    () =>
      new Set(
        Object.entries(activityAttendance)
          .filter(([, records]) => records.length > 0)
          .map(([activityId]) => activityId)
      ),
    [activityAttendance]
  );

  const submitEventInvite = async (eventObject) => {
    eventObject.preventDefault();
    try {
      setSaving(true);
      setError("");
      const created = await inviteEventStaff(eventId, {
        email: inviteEmail,
        name: inviteName || null
      });
      setStaff((previous) => [created, ...previous]);
      setInviteEmail("");
      setInviteName("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create the volunteer invitation."
      );
    } finally {
      setSaving(false);
    }
  };

  const submitActivityInvite = async (eventObject) => {
    eventObject.preventDefault();
    if (!activityInvite) return;

    try {
      setActivitySaving(true);
      setError("");
      const created = await inviteActivityStaff(activityInvite.id, {
        email: activityEmail,
        name: activityName || null
      });
      setStaff((previous) => [created, ...previous]);
      setActivityEmail("");
      setActivityName("");
      setActivityInvite(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create the activity invitation."
      );
    } finally {
      setActivitySaving(false);
    }
  };

  const handleRevoke = async (assignmentId) => {
    try {
      await revokeStaff(assignmentId);
      setStaff((previous) =>
        previous.map((item) =>
          item.id === assignmentId
            ? { ...item, status: "REVOKED" }
            : item
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not revoke this assignment."
      );
    }
  };

  const loadActivityAttendance = async (activityId) => {
    try {
      const records = await getActivityAttendance(activityId);
      setActivityAttendance((previous) => ({
        ...previous,
        [activityId]: records
      }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load activity attendance."
      );
    }
  };

  const copyInvitation = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
      setTimeout(() => setCopiedLink(""), 1500);
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
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          to={"/organizer/events/" + eventId + "/edit"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to event
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                <ShieldCheck className="h-4 w-4" />
                Event Operations
              </div>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {event?.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Volunteers, entry check-in and activity attendance.
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Invite check-in volunteer
              </h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Use an email even when the person has never used EventSphere.
            </p>
            <form onSubmit={submitEventInvite} className="mt-5 space-y-3">
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Volunteer name (optional)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <input
                required
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="volunteer@email.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <button
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {saving ? "Creating..." : "Create invitation"}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">Event staff</h2>
            <p className="mt-1 text-xs text-slate-500">
              {activeStaff.length} active · {invitedStaff.length} invited
            </p>

            <div className="mt-4 space-y-2">
              {staff.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  No volunteers assigned yet.
                </p>
              ) : (
                staff.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {item.invitedName || item.email}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.email}
                        </p>
                        <span className="mt-1 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.status}
                        </span>
                      </div>

                      {item.status !== "REVOKED" && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(item.id)}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                          title="Revoke access"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {item.invitationLink && item.status === "INVITED" && (
                      <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
                        <p className="break-all text-[10px] text-slate-500">
                          {item.invitationLink}
                        </p>
                        <button
                          type="button"
                          onClick={() => copyInvitation(item.invitationLink)}
                          className="mt-2 text-xs font-semibold text-indigo-600"
                        >
                          {copiedLink === item.invitationLink
                            ? "Copied"
                            : "Copy invitation link"}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Event entry attendance
            </h2>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-3">Participant</th>
                  <th className="px-3 py-3">Checked in</th>
                  <th className="px-3 py-3">By</th>
                  <th className="px-3 py-3">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.map((record) => (
                  <tr key={record.attendanceId}>
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      {record.participantName || record.participantId}
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {record.checkedInAt
                        ? new Date(record.checkedInAt).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {record.checkedInBy}
                    </td>
                    <td className="px-3 py-3">{record.checkInType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Activity operations
            </h2>
          </div>

          <div className="mt-4 space-y-3">
            {activities.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                No activities. This event uses event-level entry tickets.
              </p>
            ) : (
              activities.map((activity) => {
                const records = activityAttendance[activity.id] || [];

                return (
                  <div
                    key={activity.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {activity.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {records.length} activity check-ins loaded
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActivityInvite(activity);
                            setActivityEmail("");
                            setActivityName("");
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <UserPlus className="h-4 w-4" />
                          Assign activity volunteer
                        </button>

                        <button
                          type="button"
                          onClick={() => loadActivityAttendance(activity.id)}
                          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                          Load attendance
                        </button>
                      </div>
                    </div>

                    {records.length > 0 && (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {records.map((record) => (
                          <div
                            key={record.attendanceId}
                            className="rounded-lg bg-slate-50 p-3 text-xs"
                          >
                            <p className="font-semibold text-slate-800">
                              {record.participantName || record.participantId}
                            </p>
                            <p className="mt-1 text-slate-500">
                              {record.checkedInAt
                                ? new Date(
                                    record.checkedInAt
                                  ).toLocaleString()
                                : "-"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {activityInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <form
              onSubmit={submitActivityInvite}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <h2 className="text-lg font-bold text-slate-900">
                Assign volunteer
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {activityInvite.name}
              </p>

              <div className="mt-5 space-y-3">
                <input
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  placeholder="Volunteer name (optional)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <input
                  required
                  type="email"
                  value={activityEmail}
                  onChange={(e) => setActivityEmail(e.target.value)}
                  placeholder="volunteer@email.com"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActivityInvite(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  disabled={activitySaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {activitySaving ? "Creating..." : "Create invitation"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
