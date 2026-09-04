import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  Info, 
  FileText, 
  Users, 
  Plus 
} from "lucide-react";
import { 
  ACTIVITY_TYPES, 
  ACTIVITY_REGISTRATION_TYPES, 
  validateActivityForm 
} from "../utils/activityHelpers";
import { toInputDateTime, formatDateTime } from "../../events/utils/eventHelpers";
import { createActivity, updateActivity } from "../activityApi";

export default function ActivityFormModal({
  isOpen,
  eventId = null,
  parentEvent = null,
  editingActivity = null,
  editingIndex = null,
  onClose,
  onActivityCreated,
  onActivityAdded // For staged mode when creating a new event
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    location: "",
    startDateTime: "",
    endDateTime: "",
    registrationDeadline: "",
    registrationType: "INDIVIDUAL",
    registrationLimit: "UNLIMITED",
    capacity: "",
    minTeamSize: "",
    maxTeamSize: "",
    rules: "",
    visibility: ""
  });

  const [sameVenue, setSameVenue] = useState(true);
  const [sameSchedule, setSameSchedule] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // Initialize or reset form with sensible defaults based on parent event or editingActivity
  useEffect(() => {
    if (isOpen) {
      if (editingActivity) {
        setFormData({
          name: editingActivity.name || "",
          description: editingActivity.description || "",
          type: editingActivity.type || "",
          location: editingActivity.location || "",
          startDateTime: editingActivity.startDateTime ? toInputDateTime(editingActivity.startDateTime) : "",
          endDateTime: editingActivity.endDateTime ? toInputDateTime(editingActivity.endDateTime) : "",
          registrationDeadline: editingActivity.registrationDeadline ? toInputDateTime(editingActivity.registrationDeadline) : "",
          registrationType: editingActivity.registrationType || "INDIVIDUAL",
          registrationLimit: editingActivity.capacity == null ? "UNLIMITED" : "LIMITED",
          capacity: editingActivity.capacity != null ? String(editingActivity.capacity) : "",
          minTeamSize: editingActivity.minTeamSize !== undefined && editingActivity.minTeamSize !== null ? String(editingActivity.minTeamSize) : "",
          maxTeamSize: editingActivity.maxTeamSize !== undefined && editingActivity.maxTeamSize !== null ? String(editingActivity.maxTeamSize) : "",
          rules: editingActivity.rules || "",
          visibility: editingActivity.visibility || ""
        });

        const isVenueMatch = Boolean(parentEvent?.venue && editingActivity.location === parentEvent.venue);
        const isScheduleMatch = Boolean(
          parentEvent?.startDateTime && 
          parentEvent?.endDateTime && 
          toInputDateTime(editingActivity.startDateTime) === toInputDateTime(parentEvent.startDateTime) &&
          toInputDateTime(editingActivity.endDateTime) === toInputDateTime(parentEvent.endDateTime)
        );

        setSameVenue(isVenueMatch);
        setSameSchedule(isScheduleMatch);
      } else {
        const initialVenue = parentEvent?.venue || "";
        const initialStart = parentEvent?.startDateTime ? toInputDateTime(parentEvent.startDateTime) : "";
        const initialEnd = parentEvent?.endDateTime ? toInputDateTime(parentEvent.endDateTime) : "";

        setFormData({
          name: "",
          description: parentEvent?.description || "",
          type: "",
          location: initialVenue,
          startDateTime: initialStart,
          endDateTime: initialEnd,
          registrationDeadline: initialStart,
          registrationType: "INDIVIDUAL",
          registrationLimit: "UNLIMITED",
          capacity: "",
          minTeamSize: "",
          maxTeamSize: "",
          rules: "",
          visibility: ""
        });

        setSameVenue(Boolean(initialVenue));
        setSameSchedule(Boolean(initialStart && initialEnd));
      }

      setFieldErrors({});
      setServerError("");
    }
  }, [isOpen, parentEvent, editingActivity]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const isTeamRegistration = formData.registrationType === "TEAM" || formData.registrationType === "BOTH";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
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

  const handleToggleSameVenue = (e) => {
    const checked = e.target.checked;
    setSameVenue(checked);
    if (checked && parentEvent?.venue) {
      setFormData((prev) => ({
        ...prev,
        location: parentEvent.venue
      }));
      if (fieldErrors.location) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.location;
          return next;
        });
      }
    }
  };

  const handleToggleSameSchedule = (e) => {
    const checked = e.target.checked;
    setSameSchedule(checked);
    if (checked) {
      const eventStart = parentEvent?.startDateTime ? toInputDateTime(parentEvent.startDateTime) : formData.startDateTime;
      const eventEnd = parentEvent?.endDateTime ? toInputDateTime(parentEvent.endDateTime) : formData.endDateTime;
      setFormData((prev) => ({
        ...prev,
        startDateTime: eventStart,
        endDateTime: eventEnd,
        registrationDeadline: prev.registrationDeadline || eventStart
      }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.startDateTime;
        delete next.endDateTime;
        return next;
      });
    }
  };

  const handleRegistrationTypeChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      registrationType: value,
      minTeamSize: value === "INDIVIDUAL" ? "" : prev.minTeamSize || "2",
      maxTeamSize: value === "INDIVIDUAL" ? "" : prev.maxTeamSize || "4"
    }));

    if (value === "INDIVIDUAL") {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.minTeamSize;
        delete next.maxTeamSize;
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = validateActivityForm(formData, parentEvent);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Mode A: Staged mode (used inside CreateEventPage before event has an ID)
    if (!eventId && onActivityAdded) {
      onActivityAdded(formData, editingIndex);
      onClose();
      return;
    }

    // Mode B: Immediate API mode (used inside EditEventPage for an existing event)
    setIsSubmitting(true);

    try {
      const created = editingActivity
        ? await updateActivity(eventId, editingActivity.id, formData)
        : await createActivity(eventId, formData);
      if (onActivityCreated) {
        onActivityCreated(created);
      }
      onClose();
    } catch (err) {
      console.error("Failed to save activity:", err);
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.validationErrors && Object.values(err.response.data.validationErrors)[0]) ||
        "Failed to save activity. Please check all fields and try again.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-left my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 id="activity-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
              {editingActivity ? "Edit Activity" : "Add Activity to Event"}
            </h2>
            {parentEvent?.title && (
              <p className="text-xs text-slate-500 mt-0.5">
                Event: <span className="font-semibold text-slate-700">{parentEvent.title}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} noValidate className="overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Server Error Alert */}
          {serverError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1 font-medium">{serverError}</div>
            </div>
          )}

          {/* Section 1: Basic Activity Info */}
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="activity-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Activity Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="activity-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Hackathon, AI Workshop, or Project Exhibition"
                disabled={isSubmitting}
                className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.name
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                }`}
              />
              {fieldErrors.name && (
                <p className="text-xs text-rose-600 font-medium">{fieldErrors.name}</p>
              )}
            </div>

            {/* Type & Location Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label htmlFor="activity-type" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Activity Type <span className="text-rose-500">*</span>
                </label>
                <select
                  id="activity-type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors bg-white focus:outline-none focus:ring-2 ${
                    fieldErrors.type
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                  }`}
                >
                  <option value="">Select activity type</option>
                  {ACTIVITY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.type && (
                  <p className="text-xs text-rose-600 font-medium">{fieldErrors.type}</p>
                )}
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label htmlFor="activity-location" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Sub-venue / Room
                  </label>
                  {parentEvent?.venue && (
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-indigo-700 cursor-pointer font-medium select-none">
                      <input
                        type="checkbox"
                        checked={sameVenue}
                        onChange={handleToggleSameVenue}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                      />
                      <span>Same as event</span>
                    </label>
                  )}
                </div>
                <input
                  id="activity-location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => {
                    setSameVenue(false);
                    handleChange(e);
                  }}
                  placeholder="e.g. Lab 304, Seminar Hall 2, or Online"
                  disabled={isSubmitting}
                  className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.location
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                  }`}
                />
                {fieldErrors.location && (
                  <p className="text-xs text-rose-600 font-medium">{fieldErrors.location}</p>
                )}
              </div>
            </div>

            {/* Visibility (standalone activities only) */}
            {!parentEvent && (
              <div className="space-y-1.5 text-left">
                <label htmlFor="activity-visibility" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Visibility <span className="text-rose-500">*</span>
                </label>
                <select
                  id="activity-visibility"
                  name="visibility"
                  value={formData.visibility}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors bg-white focus:outline-none focus:ring-2 ${
                    fieldErrors.visibility
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                  }`}
                >
                  <option value="">Select visibility</option>
                  <option value="COLLEGE_ONLY">College Only</option>
                  <option value="OPEN_TO_ALL">Open to All</option>
                </select>
                <p className="text-[11px] text-slate-400">Who can discover and register for this activity</p>
                {fieldErrors.visibility && (
                  <p className="text-xs text-rose-600 font-medium">{fieldErrors.visibility}</p>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label htmlFor="activity-description" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Description <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">{formData.description.length}/2000</span>
              </div>
              <textarea
                id="activity-description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Briefly describe what participants will do, agenda, or learning outcomes..."
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

          {/* Section 2: Schedule & Deadlines */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Schedule & Timeline
              </h3>
              {parentEvent?.startDateTime && parentEvent?.endDateTime && (
                <label className="inline-flex items-center gap-1.5 text-[11px] text-indigo-700 cursor-pointer font-medium select-none">
                  <input
                    type="checkbox"
                    checked={sameSchedule}
                    onChange={handleToggleSameSchedule}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                  />
                  <span>Same as event dates</span>
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Start Date */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="activity-start" className="block text-xs font-semibold text-slate-700">
                  Start Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  id="activity-start"
                  name="startDateTime"
                  type="datetime-local"
                  value={formData.startDateTime}
                  onChange={(e) => {
                    setSameSchedule(false);
                    handleChange(e);
                  }}
                  disabled={isSubmitting}
                  className={`block w-full px-3 py-2 rounded-lg border text-xs sm:text-sm transition-colors focus:outline-none focus:ring-2 ${
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
                <label htmlFor="activity-end" className="block text-xs font-semibold text-slate-700">
                  End Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  id="activity-end"
                  name="endDateTime"
                  type="datetime-local"
                  value={formData.endDateTime}
                  onChange={(e) => {
                    setSameSchedule(false);
                    handleChange(e);
                  }}
                  disabled={isSubmitting}
                  className={`block w-full px-3 py-2 rounded-lg border text-xs sm:text-sm transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.endDateTime
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                  }`}
                />
                {fieldErrors.endDateTime && (
                  <p className="text-xs text-rose-600 font-medium">{fieldErrors.endDateTime}</p>
                )}
              </div>

              {/* Registration Deadline */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="activity-deadline" className="block text-xs font-semibold text-slate-700">
                  Registration Deadline <span className="text-rose-500">*</span>
                </label>
                <input
                  id="activity-deadline"
                  name="registrationDeadline"
                  type="datetime-local"
                  value={formData.registrationDeadline}
                  onChange={handleChange}
                  max={formData.startDateTime || undefined}
                  disabled={isSubmitting}
                  className={`block w-full px-3 py-2 rounded-lg border text-xs sm:text-sm transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.registrationDeadline
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                  }`}
                />
                <p className="text-[11px] text-slate-400">Must be on or before activity start</p>
                {fieldErrors.registrationDeadline && (
                  <p className="text-xs text-rose-600 font-medium">{fieldErrors.registrationDeadline}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Registration Type & Capacity */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Registration & Capacity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Registration Type */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="activity-reg-type" className="block text-xs font-semibold text-slate-700">
                  Registration Type <span className="text-rose-500">*</span>
                </label>
                <select
                  id="activity-reg-type"
                  name="registrationType"
                  value={formData.registrationType}
                  onChange={handleRegistrationTypeChange}
                  disabled={isSubmitting}
                  className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors bg-white focus:outline-none focus:ring-2 ${
                    fieldErrors.registrationType
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                  }`}
                >
                  {ACTIVITY_REGISTRATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.registrationType && (
                  <p className="text-xs text-rose-600 font-medium">{fieldErrors.registrationType}</p>
                )}
              </div>

              <fieldset className="space-y-1.5 text-left">
                <label htmlFor="activity-capacity" className="block text-xs font-semibold text-slate-700">
                  Registration limit
                </label>
                <label className="mr-3 text-xs text-slate-700"><input className="mr-1" type="radio" name="registrationLimit" value="UNLIMITED" checked={formData.registrationLimit === "UNLIMITED"} onChange={handleChange} />No limit</label>
                <label className="text-xs text-slate-700"><input className="mr-1" type="radio" name="registrationLimit" value="LIMITED" checked={formData.registrationLimit === "LIMITED"} onChange={handleChange} />Limited</label>
                {formData.registrationLimit === "UNLIMITED" ? <p className="text-xs text-slate-500">Unlimited registrations until the registration deadline.</p> : <>
                <label htmlFor="activity-capacity" className="block text-xs font-semibold text-slate-700">
                  {formData.registrationType === "INDIVIDUAL"
                    ? "Maximum Participants"
                    : formData.registrationType === "TEAM"
                    ? "Maximum Teams"
                    : "Maximum Registrations"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  id="activity-capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.capacity}
                  onChange={handleChange}
                  placeholder={
                    formData.registrationType === "TEAM"
                      ? "e.g. 30 (teams)"
                      : "e.g. 100 (participants)"
                  }
                  disabled={isSubmitting}
                  className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.capacity
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                  }`}
                />
                {fieldErrors.capacity && (
                  <p className="text-xs text-rose-600 font-medium">{fieldErrors.capacity}</p>
                )}
                </>}
              </fieldset>
            </div>

            {/* Dynamic Team Fields */}
            {isTeamRegistration && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 animate-fade-in">
                <div className="text-xs font-semibold text-slate-800">
                  Team Size Requirements
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label htmlFor="activity-min-team" className="block text-xs font-medium text-slate-700">
                      Minimum Members / Team <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="activity-min-team"
                      name="minTeamSize"
                      type="number"
                      min="1"
                      value={formData.minTeamSize}
                      onChange={handleChange}
                      placeholder="e.g. 2"
                      disabled={isSubmitting}
                      className={`block w-full px-3.5 py-2 rounded-lg border text-sm transition-colors bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        fieldErrors.minTeamSize
                          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                          : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                      }`}
                    />
                    {fieldErrors.minTeamSize && (
                      <p className="text-xs text-rose-600 font-medium">{fieldErrors.minTeamSize}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label htmlFor="activity-max-team" className="block text-xs font-medium text-slate-700">
                      Maximum Members / Team <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="activity-max-team"
                      name="maxTeamSize"
                      type="number"
                      min="1"
                      value={formData.maxTeamSize}
                      onChange={handleChange}
                      placeholder="e.g. 4"
                      disabled={isSubmitting}
                      className={`block w-full px-3.5 py-2 rounded-lg border text-sm transition-colors bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        fieldErrors.maxTeamSize
                          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                          : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
                      }`}
                    />
                    {fieldErrors.maxTeamSize && (
                      <p className="text-xs text-rose-600 font-medium">{fieldErrors.maxTeamSize}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Rules */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <label htmlFor="activity-rules" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Rules & Guidelines <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-400">{formData.rules.length}/5000</span>
            </div>
            <textarea
              id="activity-rules"
              name="rules"
              rows={3}
              value={formData.rules}
              onChange={handleChange}
              placeholder="1. Valid student ID required.&#10;2. Projects must be original work.&#10;3. Specific judging criteria..."
              disabled={isSubmitting}
              className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                fieldErrors.rules
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
              }`}
            />
            {fieldErrors.rules && (
              <p className="text-xs text-rose-600 font-medium">{fieldErrors.rules}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>{editingActivity ? "Updating..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {editingActivity
                      ? "Update Activity"
                      : eventId
                      ? "Save Activity"
                      : "Add to Event"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
}
