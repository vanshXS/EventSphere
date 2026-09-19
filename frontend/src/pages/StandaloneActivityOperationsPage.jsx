import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  Play,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
  XCircle
} from "lucide-react";

import {
  completeStandaloneActivity,
  getStandaloneActivity,
  startStandaloneActivity
} from "../features/activities/activityApi";

import {
  getActivityAttendance,
  getActivityStaff,
  inviteActivityStaff,
  revokeStaff
} from "../features/attendance/attendanceApi";

import {
  approveRegistration,
  getOrganizerActivityRegistrations,
  rejectRegistration
} from "../features/registration/registrationApi";

export default function StandaloneActivityOperationsPage() {
  const { activityId } = useParams();

  const [activity, setActivity] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingRegistrationId, setSavingRegistrationId] = useState(null);
  const [savingLifecycle, setSavingLifecycle] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [copiedLink, setCopiedLink] = useState("");

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [activityData, registrationData, staffData] = await Promise.all([
        getStandaloneActivity(activityId),
        getOrganizerActivityRegistrations(activityId),
        getActivityStaff(activityId)
      ]);

      setActivity(activityData);
      setRegistrations(registrationData);
      setStaff(staffData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load standalone activity operations."
      );
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadAttendance = async () => {
    try {
      setError("");
      const data = await getActivityAttendance(activityId);
      setAttendance(data);
      setSuccess("Activity attendance refreshed.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load activity attendance."
      );
    }
  };

  const handleStart = async () => {
    try {
      setSavingLifecycle(true);
      setError("");
      const updated = await startStandaloneActivity(activityId);
      setActivity(updated);
      setSuccess("Activity is now ongoing. Volunteer activity check-in can begin.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not start this activity."
      );
    } finally {
      setSavingLifecycle(false);
    }
  };

  const handleComplete = async () => {
    try {
      setSavingLifecycle(true);
      setError("");
      const updated = await completeStandaloneActivity(activityId);
      setActivity(updated);
      setSuccess("Activity marked as completed.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not complete this activity."
      );
    } finally {
      setSavingLifecycle(false);
    }
  };

  const handleApprove = async (registrationId) => {
    try {
      setSavingRegistrationId(registrationId);
      setError("");
      const updated = await approveRegistration(registrationId);
      setRegistrations((previous) =>
        previous.map((item) =>
          item.id === registrationId ? updated : item
        )
      );
      setSuccess("Registration approved. The participant can use the activity ticket.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not approve this registration."
      );
    } finally {
      setSavingRegistrationId(null);
    }
  };

  const openRejectDialog = (registration) => {
    setRejectTarget(registration);
    setRejectReason("");
    setError("");
  };

  const handleReject = async () => {
    if (!rejectTarget) return;

    try {
      setSavingRegistrationId(rejectTarget.id);
      setError("");

      const updated = await rejectRegistration(
        rejectTarget.id,
        rejectReason
      );

      setRegistrations((previous) =>
        previous.map((item) =>
          item.id === rejectTarget.id ? updated : item
        )
      );

      setRejectTarget(null);
      setRejectReason("");
      setSuccess("Registration rejected.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not reject this registration."
      );
    } finally {
      setSavingRegistrationId(null);
    }
  };

  const handleInvite = async (event) => {
    event.preventDefault();

    try {
      setStaffSaving(true);
      setError("");

      const created = await inviteActivityStaff(activityId, {
        email: inviteEmail,
        name: inviteName || null
      });

      setStaff((previous) => [created, ...previous]);
      setInviteEmail("");
      setInviteName("");
      setSuccess("Volunteer invitation created. Copy the invitation link below.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create the volunteer invitation."
      );
    } finally {
      setStaffSaving(false);
    }
  };

  const handleRevoke = async (assignmentId) => {
    try {
      setError("");
      await revokeStaff(assignmentId);
      setStaff((previous) =>
        previous.map((item) =>
          item.id === assignmentId
            ? { ...item, status: "REVOKED" }
            : item
        )
      );
      setSuccess("Volunteer access revoked.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not revoke volunteer access."
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

  if (!activity) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            This standalone activity could not be loaded.
          </p>
          <Link
            to="/organizer"
            className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to organizer
          </Link>
        </div>
      </div>
    );
  }

  const pendingRegistrations = registrations.filter(
    (registration) => registration.status === "PENDING"
  );

  const activeStaff = staff.filter((item) => item.status === "ACTIVE");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          to="/organizer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to organizer
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                  <Activity className="h-3.5 w-3.5" />
                  Standalone Activity
                </span>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">
                  {activity.status || "DRAFT"}
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-bold text-slate-900">
                {activity.name}
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Manage registrations, volunteer check-in access and activity attendance.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {activity.status === "PUBLISHED" && (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={savingLifecycle}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {savingLifecycle ? "Starting..." : "Start Activity"}
                </button>
              )}

              {activity.status === "ONGOING" && (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={savingLifecycle}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {savingLifecycle ? "Completing..." : "Complete Activity"}
                </button>
              )}

              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {success}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Registration requests
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {pendingRegistrations.length} pending · {registrations.length} total
                </p>
              </div>
              <button
                type="button"
                onClick={load}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                title="Refresh registration requests"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {registrations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  No participant registrations yet.
                </div>
              ) : (
                registrations.map((registration) => {
                  const isSaving = savingRegistrationId === registration.id;

                  return (
                    <div
                      key={registration.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {registration.participantName ||
                              registration.participantEmail ||
                              registration.participantId}
                          </p>
                          <p className="text-xs text-slate-500">
                            {registration.participantEmail || "Participant"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                              {registration.registrationType}
                            </span>
                            <span
                              className={
                                "rounded-md px-2 py-1 text-[10px] font-semibold " +
                                (registration.status === "PENDING"
                                  ? "bg-amber-50 text-amber-700"
                                  : registration.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : registration.status === "REJECTED"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-slate-100 text-slate-600")
                              }
                            >
                              {registration.status}
                            </span>
                          </div>
                        </div>

                        {registration.status === "PENDING" && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleApprove(registration.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <Check className="h-4 w-4" />
                              {isSaving ? "Saving..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => openRejectDialog(registration)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>

                      {registration.reviewNote && (
                        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                          Note: {registration.reviewNote}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Activity volunteer
              </h2>
            </div>

            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Assign a person to scan tickets for this activity. They can create a volunteer account from the invitation link if needed.
            </p>

            <form onSubmit={handleInvite} className="mt-5 space-y-3">
              <input
                type="text"
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                placeholder="Volunteer name (optional)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <input
                required
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="volunteer@email.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <button
                disabled={staffSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {staffSaving ? "Creating..." : "Create invitation"}
              </button>
            </form>

            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assigned volunteers
                </h3>
                <span className="text-[11px] text-slate-400">
                  {activeStaff.length} active
                </span>
              </div>

              {staff.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">
                  No volunteer assigned yet.
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
                        <p className="text-xs text-slate-500">{item.email}</p>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Activity attendance
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Only participants checked into this specific activity appear here.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadAttendance}
              className="inline-flex items-center gap-2 self-start rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <ClipboardCheck className="h-4 w-4" />
              Load attendance
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-3">Participant</th>
                  <th className="px-3 py-3">Checked in</th>
                  <th className="px-3 py-3">By</th>
                  <th className="px-3 py-3">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-slate-400"
                    >
                      No attendance records loaded.
                    </td>
                  </tr>
                ) : (
                  attendance.map((record) => (
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
                      <td className="px-3 py-3">
                        {record.checkInType}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {rejectTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-bold text-slate-900">
                Reject registration
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {rejectTarget.participantName ||
                  rejectTarget.participantEmail ||
                  "Participant"}
              </p>

              <label className="mt-5 block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">
                  Reason (optional)
                </span>
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Explain why this registration was rejected."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectTarget(null);
                    setRejectReason("");
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingRegistrationId === rejectTarget.id}
                  onClick={handleReject}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Registration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
