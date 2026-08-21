import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { createEvent } from "../eventApi";
import { createActivity } from "../../activities/activityApi";
import ActivityFormModal from "../../activities/components/ActivityFormModal";
import CompetitionForm from "../components/CompetitionForm";
import { 
  getActivityTypeLabel, 
  getActivityTypeBadgeStyle, 
  formatCapacitySummary 
} from "../../activities/utils/activityHelpers";
import { formatDateTime } from "../utils/eventHelpers";
import { 
  Calendar, 
  ArrowLeft, 
  LogOut, 
  Plus, 
  Pencil,
  Trash2, 
  MapPin, 
  Users, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { EVENT_VISIBILITIES } from "../utils/eventHelpers";

export default function CreateEventPage() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Event form data
  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    venue: "",
    startDateTime: "",
    endDateTime: "",
    visibility: "OPEN_TO_ALL"
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [stagedActivities, setStagedActivities] = useState([]);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [editingActivityIndex, setEditingActivityIndex] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [activityListError, setActivityListError] = useState("");
  const creationMode = location.state?.creationMode === "competition" ? "competition" : "multiple";

  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateEvent = () => {
    const errors = {};

    if (!eventData.title.trim()) {
      errors.title = "Event title is required";
    } else if (eventData.title.trim().length < 3 || eventData.title.trim().length > 100) {
      errors.title = "Title must be between 3 and 100 characters";
    }

    if (!eventData.venue.trim()) {
      errors.venue = "Venue / location is required";
    } else if (eventData.venue.trim().length > 200) {
      errors.venue = "Venue cannot exceed 200 characters";
    }

    if (!eventData.description.trim()) {
      errors.description = "Event description is required";
    } else if (eventData.description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters";
    } else if (eventData.description.trim().length > 2000) {
      errors.description = "Description cannot exceed 2000 characters";
    }

    if (!eventData.startDateTime) {
      errors.startDateTime = "Start date and time is required";
    }

    if (!eventData.endDateTime) {
      errors.endDateTime = "End date and time is required";
    }

    if (eventData.startDateTime && eventData.endDateTime) {
      const start = new Date(eventData.startDateTime).getTime();
      const end = new Date(eventData.endDateTime).getTime();
      if (end <= start) {
        errors.endDateTime = "End date/time must be after start date/time";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAddActivity = () => {
    setEditingActivityIndex(null);
    setShowAddActivityModal(true);
  };

  const handleOpenEditActivity = (index) => {
    setEditingActivityIndex(index);
    setShowAddActivityModal(true);
  };

  const handleCloseActivityModal = () => {
    setShowAddActivityModal(false);
    setEditingActivityIndex(null);
  };

  const handleSaveStagedActivity = (activityData, editIndex) => {
    if (editIndex !== null && editIndex !== undefined) {
      setStagedActivities((prev) =>
        prev.map((act, i) => (i === editIndex ? activityData : act))
      );
    } else {
      setStagedActivities((prev) => [...prev, activityData]);
    }
    setActivityListError("");
  };

  const handleRemoveStagedActivity = (indexToRemove) => {
    setStagedActivities((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEventValid = validateEvent();

    if (stagedActivities.length === 0) {
      setActivityListError("Add at least one activity before creating the event.");
    }

    if (!isEventValid || stagedActivities.length === 0) return;

    setIsSubmitting(true);
    setServerError("");

    let createdEvent;

    try {
      // Step 1: Create the parent event
      createdEvent = await createEvent(eventData);

      // Step 2: Create the participant-facing activities under the event.
      const activitiesToCreate = stagedActivities;
      const failedActivities = [];

      for (const act of activitiesToCreate) {
        try {
          await createActivity(createdEvent.id, act);
        } catch (actErr) {
          console.error(`Failed to add activity "${act.name}":`, actErr);
          failedActivities.push({
            name: act.name,
            error: actErr.response?.data?.message || "Failed to create activity"
          });
        }
      }

      // Step 3: Handle outcome
      if (failedActivities.length === 0) {
        const message = activitiesToCreate.length > 0
          ? `Event "${createdEvent.title}" and ${activitiesToCreate.length} ${activitiesToCreate.length === 1 ? "activity" : "activities"} created successfully.`
          : `Event "${createdEvent.title}" created successfully.`;

        navigate("/organizer", {
          state: { flashMessage: message }
        });
      } else {
        // Partial failure: Event succeeded, but some activities failed
        const failNames = failedActivities.map((f) => `"${f.name}"`).join(", ");
        navigate(`/organizer/events/${createdEvent.id}/edit`, {
          state: { 
            flashMessage: `Event created, but could not add activity ${failNames}. You can add them from the Activities section.`,
            flashTone: "error"
          }
        });
      }
    } catch (err) {
      console.error("Failed to create event:", err);
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.validationErrors && Object.values(err.response.data.validationErrors)[0]) ||
        "Failed to create event. Please check all fields and try again.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCompetition = async ({ eventData: competitionEvent, activityData }) => {
    setIsSubmitting(true);
    setServerError("");

    let createdEvent = null;

    try {
      createdEvent = await createEvent(competitionEvent);
      await createActivity(createdEvent.id, activityData);

      navigate(`/organizer/events/${createdEvent.id}/edit`, {
        state: {
          flashMessage: `Competition "${createdEvent.title}" created successfully.`,
          flashTone: "success"
        }
      });
    } catch (err) {
      console.error("Failed to create competition:", err);

      if (createdEvent) {
        navigate(`/organizer/events/${createdEvent.id}/edit`, {
          state: {
            flashMessage: `The event was created, but the activity could not be added: ${
              err.response?.data?.message || "Please add it from the Activities section."
            }`,
            flashTone: "error"
          }
        });
        return;
      }

      const msg =
        err.response?.data?.message ||
        (err.response?.data?.validationErrors && Object.values(err.response.data.validationErrors)[0]) ||
        "Failed to create the competition. Please check all fields and try again.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {creationMode === "competition" ? "Create Competition" : "Create Event"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {creationMode === "competition"
                ? "Enter the competition details once. EventSphere creates the event structure for you."
                : "Create an event and add the participant-facing activities it contains."}
            </p>
          </div>
        </div>

        {creationMode === "competition" ? (
          <CompetitionForm
            onSubmit={handleCreateCompetition}
            isSubmitting={isSubmitting}
            serverError={serverError}
          />
        ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Server Error Alert */}
          {serverError && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1 font-medium">{serverError}</div>
            </div>
          )}

          {/* Section 1: Event Information */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900 pb-2 border-b border-slate-100">
              Event Details
            </h2>

            {/* Title */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="event-title" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Event Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="event-title"
                name="title"
                type="text"
                value={eventData.title}
                onChange={handleEventChange}
                placeholder="e.g. Tech Fest 2026 or Inter-College Coding Competition"
                disabled={isSubmitting}
                className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.title
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                }`}
              />
              {fieldErrors.title && (
                <p className="text-xs text-rose-600 font-medium">{fieldErrors.title}</p>
              )}
            </div>

            {/* Venue & Visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label htmlFor="event-venue" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Venue / Location <span className="text-rose-500">*</span>
                </label>
                <input
                  id="event-venue"
                  name="venue"
                  type="text"
                  value={eventData.venue}
                  onChange={handleEventChange}
                  placeholder="e.g. Main Auditorium, Campus Ground, or Online"
                  disabled={isSubmitting}
                  className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.venue
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                  }`}
                />
                {fieldErrors.venue && (
                  <p className="text-xs text-rose-600 font-medium">{fieldErrors.venue}</p>
                )}
              </div>

              <div className="space-y-1.5 text-left">
                <label htmlFor="event-visibility" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Eligibility & Visibility <span className="text-rose-500">*</span>
                </label>
                <select
                  id="event-visibility"
                  name="visibility"
                  value={eventData.visibility}
                  onChange={handleEventChange}
                  disabled={isSubmitting}
                  className="block w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm transition-colors bg-white focus:outline-none focus:ring-2 focus:border-indigo-600 focus:ring-indigo-600/20"
                >
                  {EVENT_VISIBILITIES.map((vis) => (
                    <option key={vis.value} value={vis.value}>
                      {vis.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label htmlFor="event-description" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Event Description <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">{eventData.description.length}/2000</span>
              </div>
              <textarea
                id="event-description"
                name="description"
                rows={3}
                value={eventData.description}
                onChange={handleEventChange}
                placeholder="Overview of the event, theme, and highlights..."
                disabled={isSubmitting}
                className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.description
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                }`}
              />
              {fieldErrors.description && (
                <p className="text-xs text-rose-600 font-medium">{fieldErrors.description}</p>
              )}
            </div>
          </div>

          {/* Section 2: Event Schedule */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900 pb-2 border-b border-slate-100">
              Event Schedule
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="event-start" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Start Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  id="event-start"
                  name="startDateTime"
                  type="datetime-local"
                  value={eventData.startDateTime}
                  onChange={handleEventChange}
                  disabled={isSubmitting}
                  className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.startDateTime
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                  }`}
                />
                {fieldErrors.startDateTime && (
                  <p className="text-xs text-rose-600 font-medium">{fieldErrors.startDateTime}</p>
                )}
              </div>

              {/* End Date */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="event-end" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  End Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  id="event-end"
                  name="endDateTime"
                  type="datetime-local"
                  value={eventData.endDateTime}
                  onChange={handleEventChange}
                  disabled={isSubmitting}
                  className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.endDateTime
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                  }`}
                />
                {fieldErrors.endDateTime && (
                  <p className="text-xs text-rose-600 font-medium">{fieldErrors.endDateTime}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Activities
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add the participant-facing activities that belong to this event.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddActivity}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Activity</span>
              </button>
            </div>

            {/* Staged Activities List */}
            {stagedActivities.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/60 rounded-lg border border-dashed border-slate-200 text-xs text-slate-500 space-y-2">
                <p>No activities added yet. Add at least one before creating the event.</p>
                <button
                  type="button"
                  onClick={handleOpenAddActivity}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  + Add your first activity (e.g. Hackathon or Workshop)
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {stagedActivities.map((act, index) => {
                  const capInfo = formatCapacitySummary(
                    act.registrationType,
                    act.capacity,
                    act.minTeamSize,
                    act.maxTeamSize
                  );

                  return (
                    <div
                      key={index}
                      className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getActivityTypeBadgeStyle(act.type)}`}>
                            {getActivityTypeLabel(act.type)}
                          </span>
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {act.name}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600 pt-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDateTime(act.startDateTime)} – {formatDateTime(act.endDateTime)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium text-slate-700">
                              {capInfo.typeText} · {capInfo.capacityText} {capInfo.teamText ? `(${capInfo.teamText})` : ""}
                            </span>
                          </div>
                          {act.location && (
                            <div className="flex items-center gap-1.5 sm:col-span-2 text-slate-500">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{act.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditActivity(index)}
                          title="Edit activity"
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStagedActivity(index)}
                          title="Remove activity"
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activityListError && (
              <p className="text-xs text-rose-600 font-medium">{activityListError}</p>
            )}
          </div>

          {/* Submit Action Controls */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Link
              to="/organizer"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </Link>
              <button
                type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Creating Event...</span>
                </>
              ) : (
                <span>
                  {`Create Event (${stagedActivities.length} ${stagedActivities.length === 1 ? "Activity" : "Activities"})`}
                </span>
              )}
            </button>
          </div>
        </form>
        )}
      </main>

      {/* Add / Edit Activity Modal (Staged mode) */}
      {creationMode === "multiple" && <ActivityFormModal
        isOpen={showAddActivityModal}
        parentEvent={eventData}
        editingActivity={editingActivityIndex !== null ? stagedActivities[editingActivityIndex] : null}
        editingIndex={editingActivityIndex}
        onClose={handleCloseActivityModal}
        onActivityAdded={handleSaveStagedActivity}
      />}
    </div>
  );
}
