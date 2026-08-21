import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getMyEvent, publishEvent, deleteEvent } from "../eventApi";
import EventTable from "../components/EventTable";
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

export default function EventsPage() {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL', 'DRAFT', 'PUBLISHED'

  // Track async operations per event
  const [publishingIds, setPublishingIds] = useState(new Set());
  const [deletingIds, setDeletingIds] = useState(new Set());

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
      const data = await getMyEvent();
      setEvents(Array.isArray(data) ? data : []);
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

  // Filter events based on search query and selected filter
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // 1. Status Filter
      if (statusFilter === "DRAFT" && event.status !== "DRAFT") return false;
      if (statusFilter === "PUBLISHED" && event.status !== "PUBLISHED") return false;

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">EventSphere</span>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-100">
              Organizer
            </span>
          </div>

          <div className="flex items-center gap-3">
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
              My Events
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
        {!loading && events.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All ({events.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PUBLISHED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === "PUBLISHED"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Published ({events.filter((e) => e.status === "PUBLISHED").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DRAFT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === "DRAFT"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Drafts ({events.filter((e) => e.status === "DRAFT").length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search events by title or venue..."
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

        {/* State 2: No Events at all */}
        {!loading && !error && events.length === 0 && (
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
        {!loading && !error && events.length > 0 && filteredEvents.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No matching events found</h3>
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

        {/* State 4: Compact management table */}
        {!loading && filteredEvents.length > 0 && (
          <EventTable
            events={filteredEvents}
            onPublish={handlePublish}
            onDelete={handleDelete}
            publishingIds={publishingIds}
            deletingIds={deletingIds}
          />
        )}
      </main>
    </div>
  );
}
