
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, UserRoundCog } from "lucide-react";

export default function EventOperationsPage() {
  const { eventId } = useParams();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          to="/organizer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to events
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Event Operations
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Choose what you want to manage
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            EventSphere keeps volunteer setup and attendance separate so the
            check-in workflow stays simple.
          </p>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to={"/organizer/events/" + eventId + "/volunteers"}
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                <UserRoundCog className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-indigo-600 group-hover:text-indigo-700">
                Open
              </span>
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Volunteer Management
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Assign volunteers for the main event entry or for individual
              activities.
            </p>
          </Link>

          <Link
            to={"/organizer/events/" + eventId + "/attendance"}
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-indigo-600 group-hover:text-indigo-700">
                Open
              </span>
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Attendance
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              View event-entry check-ins or attendance for a specific activity.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
