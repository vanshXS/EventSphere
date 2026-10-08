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
  Trophy,
  Activity,
  Sparkles,
  Radio,
  FileEdit,
  CheckCircle
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

  const organizerCompletedCount = allOrganizerItems.filter(
    (item) => item.status === "COMPLETED"
  ).length;

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
              Organizer Operations Center
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Unified workspace for managing campus events, live check-ins, and volunteer scanning.
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
              <span>Create New</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isCreateMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {isCreateMenuOpen && (
              <div
                id="create-event-menu"
                className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-30 animate-in fade-in slide-in-from-top-1"
              >
                <div className="px-3 py-1.5 mb-1 border-b border-slate-100">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Choose event format</span>
                </div>
                <Link
                  to="/organizer/events/new"
                  state={{ creationMode: "multiple" }}
                  onClick={() => setIsCreateMenuOpen(false)}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-50/70 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-slate-800 group-hover:text-indigo-900">Event with Activities</span>
                    <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">Multi-tier fest, summit, or cultural day with workshops & sub-competitions.</span>
                  </div>
                </Link>
                <Link
                  to="/organizer/events/new"
                  state={{ creationMode: "competition" }}
                  onClick={() => setIsCreateMenuOpen(false)}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-50/70 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors shrink-0 mt-0.5">
                    <Trophy className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-slate-800 group-hover:text-emerald-900">Single Competition</span>
                    <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">Standalone hackathon, sport match, or quiz with direct participation.</span>
                  </div>
                </Link>
              </div>
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

        {/* Executive KPI Summary Cards */}
        {!loading && totalItems > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">Total Managed</span>
                <span className="text-xl font-bold text-slate-900">{totalItems}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">Published & Active</span>
                <span className="text-xl font-bold text-slate-900">{organizerPublishedCount}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">Ongoing Live</span>
                <span className="text-xl font-bold text-slate-900">{organizerOngoingCount}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <FileEdit className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">Draft Mode</span>
                <span className="text-xl font-bold text-slate-900">{organizerDraftCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        {!loading && totalItems > 0 && (
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Scope Segment: All, Events, Competitions */}
              <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTypeFilter("ALL")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    typeFilter === "ALL"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All Items ({totalItems})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("EVENTS")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    typeFilter === "EVENTS"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Events ({events.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("ACTIVITIES")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    typeFilter === "ACTIVITIES"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Competitions ({standaloneActivities.length})</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by title, venue, or description..."
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

            {/* Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-400 mr-1">Status:</span>
              {[
                ["ALL", "All", totalItems],
                ["PUBLISHED", "Published", organizerPublishedCount],
                ["ONGOING", "Ongoing", organizerOngoingCount],
                ["DRAFT", "Draft", organizerDraftCount],
                ["COMPLETED", "Completed", organizerCompletedCount]
              ].map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === value
                      ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* State 1: Loading Skeleton */}
        {loading && (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading your operations workspace...</p>
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
                No events or competitions yet
              </h2>
              <p className="text-sm text-slate-500">
                Create your first event to start managing activities, volunteer check-in scanners, and attendee ticketing.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCreateMenuOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Event</span>
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
              Try adjusting your search query or switching your status/type filter.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setTypeFilter("ALL");
                }}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          </div>
        )}

        {/* State 4: Clean unified management table */}
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
          />
        )}
      </main>
    </div>
  );
}
