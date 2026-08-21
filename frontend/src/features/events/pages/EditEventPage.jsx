import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getEventById, updateEvent } from "../eventApi";
import { getActivitiesByEvent } from "../../activities/activityApi";
import EventForm from "../components/EventForm";
import EventStatusBadge from "../components/EventStatusBadge";
import ActivityList from "../../activities/components/ActivityList";
import { 
  formatDateRange,
  formatDateTime,
  getVisibilityLabel 
} from "../utils/eventHelpers";
import { 
  Calendar, 
  ArrowLeft, 
  LogOut, 
  Loader2, 
  AlertCircle, 
  MapPin, 
  Lock,
  Globe,
  CheckCircle2
} from "lucide-react";

export default function EditEventPage() {
  const { eventId } = useParams();
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // Activity module state
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState("");
  const [activitySuccessMessage, setActivitySuccessMessage] = useState("");
  const [flashMessage, setFlashMessage] = useState(location.state?.flashMessage || "");
  const flashTone = location.state?.flashTone || "success";

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError("");
      const data = await getEventById(eventId);
      setEvent(data);
    } catch (err) {
      console.error("Failed to load event details:", err);
      setFetchError(
        err.response?.data?.message ||
        "Unable to load event details. The event might not exist or you may lack permissions."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchActivities = useCallback(async () => {
    if (!eventId) return;
    try {
      setActivitiesLoading(true);
      setActivitiesError("");
      const data = await getActivitiesByEvent(eventId);
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load activities:", err);
      setActivitiesError(
        err.response?.data?.message || "Unable to load activities for this event."
      );
    } finally {
      setActivitiesLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    if (event) {
      fetchActivities();
    }
  }, [event, fetchActivities]);

  // Clear activity success message after 4s
  useEffect(() => {
    if (activitySuccessMessage) {
      const timer = setTimeout(() => setActivitySuccessMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [activitySuccessMessage]);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setServerError("");

    try {
      await updateEvent(eventId, formData);
      navigate("/organizer", {
        state: { flashMessage: "Event updated successfully." }
      });
    } catch (err) {
      console.error("Failed to update event:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.validationErrors && Object.values(err.response.data.validationErrors)[0] ||
        "Failed to update event. Please check all fields and try again.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivityCreated = (newActivity) => {
    setActivities((prev) => [newActivity, ...prev]);
    setActivitySuccessMessage(`Activity "${newActivity.name}" added successfully.`);
  };

  const isDraft = event?.status === "DRAFT";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
              <span className="hidden sm:inline text-xs text-slate-500">
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation & Header */}
        <div className="space-y-2">
          <Link
            to="/organizer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Events</span>
          </Link>

          {event && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {isDraft ? "Edit Event & Activities" : "Event Overview & Activities"}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {isDraft
                    ? "Manage event details, schedule, and associated activities."
                    : "Published festival specifications and scheduled activities."}
                </p>
              </div>
              <EventStatusBadge status={event.status} />
            </div>
          )}
        </div>

        {/* Global Notifications */}
        {flashMessage && (
          <div
            role={flashTone === "error" ? "alert" : "status"}
            className={`p-3.5 rounded-xl border text-sm flex items-start justify-between gap-2.5 ${
              flashTone === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <div className="flex items-start gap-2.5 font-medium">
              {flashTone === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
              )}
              <span>{flashMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setFlashMessage("")}
              className="text-xs font-semibold underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
        {activitySuccessMessage && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="flex-1 font-medium">{activitySuccessMessage}</div>
          </div>
        )}

        {/* State 1: Loading */}
        {loading && (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading event details...</p>
          </div>
        )}

        {/* State 2: Fetch Error */}
        {!loading && fetchError && (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center space-y-4 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h2 className="text-base font-semibold text-slate-900">Event Not Found</h2>
              <p className="text-sm text-slate-500">{fetchError}</p>
            </div>
            <Link
              to="/organizer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Events</span>
            </Link>
          </div>
        )}

        {/* State 3A: DRAFT -> Editable Form + Activities */}
        {!loading && event && isDraft && (
          <div className="space-y-8">
            <EventForm
              initialData={event}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitLabel="Save Changes"
              serverError={serverError}
            />

            {/* Activities Section */}
            <ActivityList
              eventId={eventId}
              parentEvent={event}
              activities={activities}
              loading={activitiesLoading}
              error={activitiesError}
              onActivityCreated={handleActivityCreated}
              onRefresh={fetchActivities}
            />
          </div>
        )}

        {/* State 3B: Non-DRAFT -> Read-Only Event Overview + Activities */}
        {!loading && event && !isDraft && (
          <div className="space-y-6">
            {/* Notice Alert */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs sm:text-sm flex items-start gap-3">
              <Lock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">Event is {event.status}.</span>{" "}
                Core event parameters and schedules cannot be modified once published.
              </div>
            </div>

            {/* Event Overview Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              {/* Title, Visibility & Status */}
              <div className="space-y-2 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 inline-flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-400" />
                    <span>{getVisibilityLabel(event.visibility)}</span>
                  </span>
                  <EventStatusBadge status={event.status} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {event.title}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>

              {/* Schedule & Venue Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 pb-5 text-sm">
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase">Event Duration</div>
                      <div className="text-slate-800 font-medium mt-0.5">
                        {formatDateRange(event.startDateTime, event.endDateTime)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase">Venue / Campus Location</div>
                      <div className="text-slate-800 font-medium mt-0.5">
                        {event.venue || "Not specified"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 flex justify-end">
                <Link
                  to="/organizer"
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                >
                  Return to My Events
                </Link>
              </div>
            </div>

            {/* Activities Section */}
            <ActivityList
              eventId={eventId}
              parentEvent={event}
              activities={activities}
              loading={activitiesLoading}
              error={activitiesError}
              onActivityCreated={handleActivityCreated}
              onRefresh={fetchActivities}
            />
          </div>
        )}
      </main>
    </div>
  );
}
