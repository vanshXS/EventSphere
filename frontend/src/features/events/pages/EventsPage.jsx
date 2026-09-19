import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Calendar, 
  Plus, 
  LogOut, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2, 
  CalendarDays,
  Search,
  ChevronDown,
  Layers,
  Trophy
} from "lucide-react";
import CollegeNavbarBadge from "../../../components/common/CollegeNavbarBadge";

export default function EventsPage() {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [standaloneActivities, setStandaloneActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL', 'DRAFT', 'PUBLISHED'

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
      setSuccessMessage(location.state.flashMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

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
      setError(
        err.response?.data?.message ||
        "Unable to load your events. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Clear flash messages after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handlePublish = async (eventId) => {
    try {
      setPublishingIds((prev) => new Set(prev).add(eventId));
      const updated = await publishEvent(eventId);
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? updated : e))
      );
      setSuccessMessage("Event published successfully.");
    } catch (err) {
      console.error("Failed to publish event:", err);
      setError(
        err.response?.data?.message || "Failed to publish event. Please try again."
      );
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
      setSuccessMessage("Event deleted successfully.");
    } catch (err) {
      console.error("Failed to delete event:", err);
      setError(
        err.response?.data?.message || "Failed to delete event. Please try again."
      );
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
      setSuccessMessage("Competition published successfully. Participants can now register.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to publish competition. Please try again.");
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
      setSuccessMessage("Activity deleted successfully.");
    } catch (err) {
      console.error("Failed to delete activity:", err);
      setError(
        err.response?.data?.message || "Failed to delete activity. Please try again."
      );
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
      setSuccessMessage("Activity started successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to start the activity. Please try again."
      );
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
      setSuccessMessage("Activity completed successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to complete the activity. Please try again."
      );
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
    return events.filter((event) => {
      // 1. Status Filter
      if (statusFilter !== "ALL" && event.status !== statusFilter) return false;

      // 2. Search Query (Title or Venue)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = event.title?.toLowerCase().includes(query);
        const matchVenue = event.venue?.toLowerCase().includes(query);
        const matchDesc = event.description?.toLowerCase().includes(query);
        return matchTitle || matchVenue || matchDesc;
      }

      return true;
    });
  }, [events, statusFilter, searchQuery]);

  // Filter standalone activities based on search query
  const filteredActivities = useMemo(() => {
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
  }, [standaloneActivities, searchQuery, statusFilter]);

  const totalItems = events.length + standaloneActivities.length;
  const totalFilteredItems = filteredEvents.length + filteredActivities.length;

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

  const nextOrganizerItem = [...allOrganizerItems]
    .filter(
      (item) =>
        item.startDateTime &&
        new Date(item.startDateTime).getTime() > Date.now() &&
        item.status !== "COMPLETED"
    )
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime()
    )[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <div className="bg-indigo-600 text-white p-2 rounded-lg shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="shrink-0 flex items-center">
              <span className="font-bold text-lg text-slate-900 tracking-tight">EventSphere</span>
              <span className="ml-2.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-100">
                Organizer
              </span>
            </div>

            <div className="hidden md:block h-6 w-px bg-slate-200" />

            <CollegeNavbarBadge
              collegeName={user?.collegeName}
              collegeCode={user?.collegeCode}
              collegeId={user?.collegeId}
              className="hidden md:flex"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <CollegeNavbarBadge
              collegeName={user?.collegeName}
              collegeCode={user?.collegeCode}
              collegeId={user?.collegeId}
              compact={true}
              className="flex md:hidden"
            />
            {user?.name && (
              <span className="hidden sm:inline text-xs text-slate-500 font-medium">
                {user.name}
              </span>
            )}
            <button
              onClick={logoutUser}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              My Events & Activities
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Create and manage your college events and activities
            </p>
          </div>

          <div className="relative shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsCreateMenuOpen((current) => !current)}
              aria-expanded={isCreateMenuOpen}
              aria-controls="create-event-menu"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isCreateMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {isCreateMenuOpen && (
              <div
                id="create-event-menu"
                className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 z-10"
              >
                <Link
                  to="/organizer/events/new"
                  state={{ creationMode: "competition" }}
                  onClick={() => setIsCreateMenuOpen(false)}
                  className="flex items-start gap-3 px-3 py-3 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <Trophy className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">Competition / Activity</span>
                    <span className="block text-xs text-slate-500 mt-0.5">Create one participant-facing competition.</span>
                  </span>
                </Link>
                <Link
                  to="/organizer/events/new"
                  state={{ creationMode: "multiple" }}
                  onClick={() => setIsCreateMenuOpen(false)}
                  className="flex items-start gap-3 px-3 py-3 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <Layers className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">Event with activities</span>
                    <span className="block text-xs text-slate-500 mt-0.5">Create a fest or program with participant activities.</span>
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Total
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {totalItems}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Published
            </p>
            <p className="mt-1 text-lg font-bold text-indigo-700">
              {organizerPublishedCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Ongoing
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-700">
              {organizerOngoingCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Next
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
              {nextOrganizerItem?.name || "No upcoming item"}
            </p>
            {nextOrganizerItem?.startDateTime && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                {new Date(nextOrganizerItem.startDateTime).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Global Notifications */}
        {successMessage && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between gap-2.5"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={fetchEvents}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        {!loading && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            {/* Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                ["ALL", "All", totalItems],
                [
                  "DRAFT",
                  "Draft",
                  organizerDraftCount
                ],
                [
                  "PUBLISHED",
                  "Published",
                  organizerPublishedCount
                ],
                [
                  "ONGOING",
                  "Ongoing",
                  organizerOngoingCount
                ],
                [
                  "COMPLETED",
                  "Completed",
                  allOrganizerItems.filter(
                    (item) => item.status === "COMPLETED"
                  ).length
                ]
              ].map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === value
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, venue, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 hover:bg-white focus:bg-white rounded-lg border border-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* State 1: Loading Skeleton */}
        {loading && (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading your events...</p>
          </div>
        )}

        {/* State 2: No Events or Activities at all */}
        {!loading && !error && totalItems === 0 && (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h2 className="text-base font-semibold text-slate-900">
                No events yet
              </h2>
              <p className="text-sm text-slate-500">
                Create your first event to start managing activities and registrations.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCreateMenuOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Event above</span>
              </button>
            </div>
          </div>
        )}

        {/* State 3: Filter / Search returns 0 items */}
        {!loading && !error && totalItems > 0 && totalFilteredItems === 0 && (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No matching items found</h3>
            <p className="text-xs text-slate-500">
              Try adjusting your search query or switching to a different status filter.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          </div>
        )}

        {/* State 4: Unified management table */}
        {!loading && totalFilteredItems > 0 && (
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
            onStartActivity={handleStartActivity}
            onCompleteActivity={handleCompleteActivity}
          />
        )}
      </main>
    </div>
  );
}
