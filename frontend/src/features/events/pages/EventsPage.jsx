import { useEffect, useState, useCallback, useMemo } from "react";
import OrganizerAffiliationPanel from "../../auth/components/OrganizerAffiliationPanel";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getMyEvent, publishEvent, deleteEvent } from "../eventApi";
import EventTable from "../components/EventTable";
import {
  getStandaloneActivities,
  publishStandaloneActivity,
  deleteStandaloneActivity,
  startStandaloneActivity,
  completeStandaloneActivity
} from "../../activities/activityApi";
import {
  Plus,
  Loader2,
  CalendarDays,
  Search,
  ChevronDown,
  Layers,
  Trophy,
  Radio,
  FileEdit,
  CheckCircle
} from "lucide-react";
import AppHeader from "../../../components/common/AppHeader";
import { useToast } from "../../../components/common/ToastContext";
import "../../../styles/organizer-experience.css";

export default function EventsPage() {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const addToast = useToast();

  const [events, setEvents] = useState([]);
  const [standaloneActivities, setStandaloneActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [error, setError] = useState("");
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL"); // 'ALL', 'EVENTS', 'ACTIVITIES'
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL', 'DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED'

  // Track async operations per event
  const [publishingIds, setPublishingIds] = useState(new Set());
  const [publishingActivityIds, setPublishingActivityIds] = useState(new Set());
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [deletingActivityIds, setDeletingActivityIds] = useState(new Set());
  const [startingActivityIds, setStartingActivityIds] = useState(new Set());
  const [completingActivityIds, setCompletingActivityIds] = useState(new Set());

  // Handle one-time flash message from navigation
  useEffect(() => {
    if (location.state?.flashMessage) {
      addToast(
        location.state.flashMessage,
        location.state.flashTone === "error" ? "error" : "success"
      );
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, addToast]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [eventData, activityData] = await Promise.all([getMyEvent(), getStandaloneActivities()]);
      const sortedEvents = (Array.isArray(eventData) ? eventData : []).sort(
        (a, b) => new Date(b.createdAt || b.startDateTime || 0) - new Date(a.createdAt || a.startDateTime || 0)
      );
      const sortedActivities = (Array.isArray(activityData) ? activityData : []).sort(
        (a, b) => new Date(b.createdAt || b.startDateTime || 0) - new Date(a.createdAt || a.startDateTime || 0)
      );
      setEvents(sortedEvents);
      setStandaloneActivities(sortedActivities);
    } catch (err) {
      console.error("Failed to load events:", err);
      const message = err.response?.data?.message ||
        "Unable to load your events. Please check your connection and try again.";
      setError(message);
      addToast(message, "error", {
        actionLabel: "Retry",
        onAction: () => setReloadVersion((version) => version + 1)
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchEvents();
    });
    return () => { active = false; };
  }, [fetchEvents, reloadVersion]);

  const handlePublish = async (eventId) => {
    try {
      setPublishingIds((prev) => new Set(prev).add(eventId));
      const updated = await publishEvent(eventId);
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? updated : e))
      );
      addToast("Event published successfully.", "success");
    } catch (err) {
      console.error("Failed to publish event:", err);
      const message = err.response?.data?.message || "Failed to publish event. Please try again.";
      setError(message);
      addToast(message, "error");
      throw err;
    } finally {
      setPublishingIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  const handleDelete = async (eventId) => {
    try {
      setDeletingIds((prev) => new Set(prev).add(eventId));
      await deleteEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      addToast("Event deleted successfully.", "success");
    } catch (err) {
      console.error("Failed to delete event:", err);
      const message = err.response?.data?.message || "Failed to delete event. Please try again.";
      setError(message);
      addToast(message, "error");
      throw err;
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  const handlePublishActivity = async (activityId) => {
    try {
      setPublishingActivityIds((prev) => new Set(prev).add(activityId));
      const updated = await publishStandaloneActivity(activityId);
      setStandaloneActivities((prev) => prev.map((activity) => activity.id === activityId ? updated : activity));
      addToast("Competition published successfully. Participants can now register.", "success");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to publish competition. Please try again.";
      setError(message);
      addToast(message, "error");
      throw err;
    } finally {
      setPublishingActivityIds((prev) => { const next = new Set(prev); next.delete(activityId); return next; });
    }
  };

  const handleDeleteActivity = async (activityId) => {
    try {
      setDeletingActivityIds((prev) => new Set(prev).add(activityId));
      await deleteStandaloneActivity(activityId);
      setStandaloneActivities((prev) => prev.filter((a) => a.id !== activityId));
      addToast("Activity deleted successfully.", "success");
    } catch (err) {
      console.error("Failed to delete activity:", err);
      const message = err.response?.data?.message || "Failed to delete activity. Please try again.";
      setError(message);
      addToast(message, "error");
      throw err;
    } finally {
      setDeletingActivityIds((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }
  };

  const handleStartActivity = async (activityId) => {
    try {
      setStartingActivityIds((previous) => new Set(previous).add(activityId));
      setError("");
      const updated = await startStandaloneActivity(activityId);
      setStandaloneActivities((previous) =>
        previous.map((activity) =>
          activity.id === activityId ? updated : activity
        )
      );
      addToast("Activity started successfully.", "success");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to start the activity. Please try again.";
      setError(message);
      addToast(message, "error");
      throw err;
    } finally {
      setStartingActivityIds((previous) => {
        const next = new Set(previous);
        next.delete(activityId);
        return next;
      });
    }
  };

  
  const handleCompleteActivity = async (activityId) => {
    try {
      setCompletingActivityIds((previous) => new Set(previous).add(activityId));
      setError("");
      const updated = await completeStandaloneActivity(activityId);
      setStandaloneActivities((previous) =>
        previous.map((activity) =>
          activity.id === activityId ? updated : activity
        )
      );
      addToast("Activity completed successfully.", "success");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to complete the activity. Please try again.";
      setError(message);
      addToast(message, "error");
      throw err;
    } finally {
      setCompletingActivityIds((previous) => {
        const next = new Set(previous);
        next.delete(activityId);
        return next;
      });
    }
  };

  // Filter events based on search query and selected filter
  const filteredEvents = useMemo(() => {
    if (typeFilter === "ACTIVITIES") return [];

    return events.filter((event) => {
      // 1. Status Filter
      if (statusFilter !== "ALL" && event.status !== statusFilter) return false;

      // 2. Search Query (Title, Venue, or Desc)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = event.title?.toLowerCase().includes(query);
        const matchVenue = event.venue?.toLowerCase().includes(query);
        const matchDesc = event.description?.toLowerCase().includes(query);
        return matchTitle || matchVenue || matchDesc;
      }

      return true;
    });
  }, [events, statusFilter, searchQuery, typeFilter]);

  // Filter standalone activities based on search query
  const filteredActivities = useMemo(() => {
    if (typeFilter === "EVENTS") return [];

    const statusMatched = standaloneActivities.filter(
      (activity) =>
        statusFilter === "ALL" ||
        (activity.status || "DRAFT") === statusFilter
    );
    if (!searchQuery.trim()) return statusMatched;
    const query = searchQuery.toLowerCase();
    return statusMatched.filter((a) => {
      const matchName = a.name?.toLowerCase().includes(query);
      const matchDesc = a.description?.toLowerCase().includes(query);
      const matchLocation = a.location?.toLowerCase().includes(query);
      return matchName || matchDesc || matchLocation;
    });
  }, [standaloneActivities, searchQuery, statusFilter, typeFilter]);

  const totalItems = events.length + standaloneActivities.length;

  const allOrganizerItems = [
    ...events.map((event) => ({
      kind: "EVENT",
      name: event.title,
      status: event.status || event.eventStatus,
      startDateTime: event.startDateTime
    })),
    ...standaloneActivities.map((activity) => ({
      kind: "ACTIVITY",
      name: activity.name,
      status: activity.status || "DRAFT",
      startDateTime: activity.startDateTime
    }))
  ];

  const organizerPublishedCount = allOrganizerItems.filter(
    (item) => item.status === "PUBLISHED"
  ).length;

  const organizerOngoingCount = allOrganizerItems.filter(
    (item) => item.status === "ONGOING"
  ).length;

  const organizerDraftCount = allOrganizerItems.filter(
    (item) => item.status === "DRAFT"
  ).length;

  return (
    <div className="organizer-workspace organizer-events-page min-h-screen bg-slate-50 text-slate-900">
      <AppHeader
        user={user}
        onLogout={logoutUser}
        roleBadge={{ label: "Organizer", color: "indigo" }}
      />

      <main className="organizer-page-main mx-auto w-full max-w-7xl space-y-7 px-6 py-8 max-md:px-4">
        {user?.collegeVerificationMode === "MANUAL_DOCUMENTS" && <OrganizerAffiliationPanel />}

        <section className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700">
              Organizer workspace
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 max-md:text-2xl">
              My events
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Create events and competitions, manage their lifecycle, and open the tools for each one.
            </p>
          </div>

          <div className="relative w-full shrink-0 sm:w-auto">
            <button
              type="button"
              onClick={() => setIsCreateMenuOpen((current) => !current)}
              aria-expanded={isCreateMenuOpen}
              aria-controls="organizer-create-menu"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Create new
              <ChevronDown className={`h-4 w-4 transition-transform ${isCreateMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {isCreateMenuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-20 cursor-default"
                  aria-label="Close create menu"
                  onClick={() => setIsCreateMenuOpen(false)}
                />
                <div
                  id="organizer-create-menu"
                  className="absolute right-0 top-full z-30 mt-2 w-full min-w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg sm:w-80"
                >
                  <p className="border-b border-slate-100 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Choose what to create
                  </p>
                  <Link
                    to="/organizer/events/new"
                    state={{ creationMode: "multiple" }}
                    onClick={() => setIsCreateMenuOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-indigo-50/60"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                      <Layers className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">Event with activities</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                        A larger event with workshops or multiple competitions.
                      </span>
                    </span>
                  </Link>
                  <Link
                    to="/organizer/events/new"
                    state={{ creationMode: "competition" }}
                    onClick={() => setIsCreateMenuOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-emerald-50/60"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Trophy className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">Standalone competition</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                        A single competition with its own registration and operations.
                      </span>
                    </span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        {!loading && !error && totalItems > 0 && (
          <section aria-label="Organizer event summary" className="grid grid-cols-2 divide-x divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-4 sm:divide-y-0">
            {[
              { label: "Total items", value: totalItems, icon: Layers },
              { label: "Published", value: organizerPublishedCount, icon: CheckCircle },
              { label: "Ongoing", value: organizerOngoingCount, icon: Radio },
              { label: "Drafts", value: organizerDraftCount, icon: FileEdit }
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex min-w-0 items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{value}</p>
                </div>
                <Icon className="h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
              </div>
            ))}
          </section>
        )}

        {error && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-rose-800">{error}</p>
            <button
              type="button"
              onClick={() => setReloadVersion((version) => version + 1)}
              className="shrink-0 text-sm font-semibold text-rose-800 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        {loading && (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">Loading your events…</p>
          </div>
        )}

        {!loading && !error && totalItems === 0 && (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
              <CalendarDays className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No events or competitions yet</h2>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-500">
              Create an event with activities or a standalone competition to start managing registrations and operations.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateMenuOpen(true)}
              className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Create your first item
            </button>
          </div>
        )}

        {!loading && totalItems > 0 && (
          <EventTable
            events={filteredEvents}
            standaloneActivities={filteredActivities}
            onPublish={handlePublish}
            onPublishActivity={handlePublishActivity}
            onDelete={handleDelete}
            onDeleteActivity={handleDeleteActivity}
            onStartActivity={handleStartActivity}
            onCompleteActivity={handleCompleteActivity}
            publishingIds={publishingIds}
            publishingActivityIds={publishingActivityIds}
            deletingIds={deletingIds}
            deletingActivityIds={deletingActivityIds}
            startingActivityIds={startingActivityIds}
            completingActivityIds={completingActivityIds}
            totalItems={totalItems}
            toolbar={
              <div className="flex flex-col gap-3 p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex w-full items-center gap-1 overflow-x-auto lg:w-auto">
                    {[
                      ["ALL", "All Items", totalItems],
                      ["EVENTS", "Events", events.length],
                      ["ACTIVITIES", "Competitions", standaloneActivities.length]
                    ].map(([value, label, count]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTypeFilter(value)}
                        aria-pressed={typeFilter === value}
                        className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                          typeFilter === value
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {label}
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                          typeFilter === value ? "bg-white text-indigo-700" : "bg-slate-100 text-slate-600"
                        }`}>{count}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                    <label className="relative min-w-0 flex-1 lg:w-72">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by name, venue or description"
                        aria-label="Search events and competitions"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                    <label className="relative sm:w-36">
                      <span className="sr-only">Filter by status</span>
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-9 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="ALL">All statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="ONGOING">Ongoing</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </label>
                  </div>
                </div>
                {(searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL") && (
                  <div className="flex justify-end border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("ALL");
                        setTypeFilter("ALL");
                      }}
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            }
          />
        )}
      </main>
    </div>
  );
}
