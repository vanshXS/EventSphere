
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ClipboardCheck, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getEventById } from "../features/events/eventApi";
import { getActivitiesByEvent } from "../features/activities/activityApi";
import { getActivityAttendance } from "../features/attendance/attendanceApi";
import { useToast } from "../components/common/ToastContext";

export default function EventActivityAttendancePage() {
  const { eventId } = useParams();
  const addToast = useToast();
  const [event, setEvent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const setError = useCallback((message) => {
    if (message) addToast(message, "error");
  }, [addToast]);

  const loadBase = useCallback(async () => {
    try {
      setLoading(true);
      const [eventData, activityData] = await Promise.all([
        getEventById(eventId),
        getActivitiesByEvent(eventId)
      ]);
      setEvent(eventData);
      setActivities(activityData);
      if (activityData.length > 0) {
        setSelectedActivityId((current) =>
          activityData.some((item) => item.id === current)
            ? current
            : activityData[0].id
        );
      } else {
        setSelectedActivityId("");
        setAttendance([]);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load event activities."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId, setError]);

  const loadAttendance = useCallback(async () => {
    if (!selectedActivityId) {
      setAttendance([]);
      return;
    }

    try {
      setAttendanceLoading(true);
      setAttendance(await getActivityAttendance(selectedActivityId));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load activity attendance."
      );
    } finally {
      setAttendanceLoading(false);
    }
  }, [selectedActivityId, setError]);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <RefreshCw className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  const selectedActivity = activities.find(
    (activity) => activity.id === selectedActivityId
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          to={"/organizer/events/" + eventId + "/attendance"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to attendance
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Activity attendance
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {event?.title}
          </h1>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Activity
              </span>
              <select
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              >
                <option value="">Select an activity</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={loadAttendance}
              disabled={!selectedActivityId || attendanceLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={"h-4 w-4 " + (attendanceLoading ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>
        </section>

        {!selectedActivity ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Select an activity to view its attendance.
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-indigo-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {selectedActivity.name}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {attendance.length} activity check-in{attendance.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
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
                        No activity check-ins yet.
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
                        <td className="px-5 py-4 text-slate-500">
                          {record.checkedInBy}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {record.checkInType}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
