
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ClipboardCheck, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getEventById } from "../features/events/eventApi";
import { getEventAttendance } from "../features/attendance/attendanceApi";
import { useToast } from "../components/common/ToastContext";

export default function EventEntryAttendancePage() {
  const { eventId } = useParams();
  const addToast = useToast();
  const [event, setEvent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const setError = useCallback((message) => {
    if (message) addToast(message, "error");
  }, [addToast]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [eventData, attendanceData] = await Promise.all([
        getEventById(eventId),
        getEventAttendance(eventId)
      ]);
      setEvent(eventData);
      setAttendance(attendanceData);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load event attendance."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId, setError]);

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
          to={"/organizer/events/" + eventId + "/attendance"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to attendance
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Event entry attendance
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">
                {event?.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {attendance.length} event-entry check-in{attendance.length === 1 ? "" : "s"}
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

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Event gate check-ins
              </h2>
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
                      No event-entry check-ins yet.
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
      </div>
    </div>
  );
}
