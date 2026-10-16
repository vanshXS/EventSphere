
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ClipboardCheck, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getStandaloneActivity } from "../features/activities/activityApi";
import { getActivityAttendance } from "../features/attendance/attendanceApi";

export default function StandaloneActivityAttendancePage() {
  const { activityId } = useParams();
  const [activity, setActivity] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [activityData, attendanceData] = await Promise.all([
        getStandaloneActivity(activityId),
        getActivityAttendance(activityId)
      ]);
      setActivity(activityData);
      setAttendance(attendanceData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load activity attendance."
      );
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    load();
  }, [load]);

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
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Activity attendance
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">{activity?.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {attendance.length} check-in{attendance.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Participant check-ins</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-5 py-3">Participant</th>
                  <th className="px-5 py-3">Checked in</th>
                  <th className="px-5 py-3">Volunteer</th>
                  <th className="px-5 py-3">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                      No check-ins yet.
                    </td>
                  </tr>
                ) : (
                  attendance.map((record) => (
                    <tr key={record.attendanceId}>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {record.participantName || record.participantId}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {record.checkedInAt
                          ? new Date(record.checkedInAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-500">{record.checkedInBy}</td>
                      <td className="px-5 py-4 text-slate-500">{record.checkInType}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
