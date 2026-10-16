
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarCheck2, ClipboardList } from "lucide-react";

export default function EventAttendancePage() {
  const { eventId } = useParams();

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
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Attendance
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Where do you want to view attendance?
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Event entry and activity attendance are stored separately.
          </p>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to={"/organizer/events/" + eventId + "/attendance/event-entry"}
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-emerald-200 hover:shadow-sm"
          >
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 w-fit">
              <CalendarCheck2 className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Event entry attendance
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              See everyone checked in through the event gate.
            </p>
          </Link>

          <Link
            to={"/organizer/events/" + eventId + "/attendance/activities"}
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-emerald-200 hover:shadow-sm"
          >
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 w-fit">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Activity attendance
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Select an activity and view its participant check-ins.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
