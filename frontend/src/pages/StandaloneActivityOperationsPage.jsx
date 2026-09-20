
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarCheck2, ClipboardList, Play, CheckCircle2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  getStandaloneActivity,
  startStandaloneActivity,
  completeStandaloneActivity
} from "../features/activities/activityApi";

export default function StandaloneActivityOperationsPage() {
  const { activityId } = useParams();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingLifecycle, setSavingLifecycle] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setActivity(await getStandaloneActivity(activityId));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load this activity."
      );
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    load();
  }, [load]);

  const start = async () => {
    try {
      setSavingLifecycle(true);
      setError("");
      setActivity(await startStandaloneActivity(activityId));
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not start this activity."
      );
    } finally {
      setSavingLifecycle(false);
    }
  };

  const complete = async () => {
    try {
      setSavingLifecycle(true);
      setError("");
      setActivity(await completeStandaloneActivity(activityId));
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not complete this activity."
      );
    } finally {
      setSavingLifecycle(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <span className="text-sm text-slate-500">Loading activity...</span>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">{error || "Activity not found."}</p>
          <Link
            to="/organizer"
            className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to events
          </Link>
        </div>
      </div>
    );
  }

  const isPastEnd =
    Boolean(activity.endDateTime) &&
    new Date(activity.endDateTime).getTime() <= Date.now();
  const isNotStarted = activity.status === "PUBLISHED" && isPastEnd;

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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Activity Operations
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">
                {activity.name}
              </h1>
              <span className={
                "mt-3 inline-flex rounded-md border px-2 py-1 text-[10px] font-bold " +
                (isNotStarted
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-slate-50 text-slate-600")
              }>
                {isNotStarted ? "Not started" : activity.status || "DRAFT"}
              </span>
            </div>

            <div className="flex gap-2">
              {activity.status === "PUBLISHED" && !isPastEnd && (
                <button
                  type="button"
                  onClick={start}
                  disabled={savingLifecycle}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {savingLifecycle ? "Starting..." : "Start activity"}
                </button>
              )}

              {activity.status === "ONGOING" && (
                <button
                  type="button"
                  onClick={complete}
                  disabled={savingLifecycle}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {savingLifecycle ? "Completing..." : "Complete activity"}
                </button>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to={"/organizer/activities/" + activityId + "/volunteers"}
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-sm"
          >
            <div className="w-fit rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <CalendarCheck2 className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Activity volunteers
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Assign people who can scan tickets for this activity.
            </p>
          </Link>

          <Link
            to={"/organizer/activities/" + activityId + "/attendance"}
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-sm"
          >
            <div className="w-fit rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Activity attendance
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              View everyone who has checked into this activity.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
