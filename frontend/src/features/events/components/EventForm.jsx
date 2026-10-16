import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  AlertCircle, 
  Loader2, 
  Calendar, 
  MapPin, 
  Globe,
  Info
} from "lucide-react";
import { EVENT_VISIBILITIES, toInputDateTime } from "../utils/eventHelpers";

export default function EventForm({ 
  initialData = null, 
  onSubmit, 
  isSubmitting = false, 
  submitLabel = "Save Event",
  serverError = ""
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    venue: "",
    startDateTime: "",
    endDateTime: "",
    visibility: "OPEN_TO_ALL"
  });

  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        venue: initialData.venue || "",
        startDateTime: toInputDateTime(initialData.startDateTime),
        endDateTime: toInputDateTime(initialData.endDateTime),
        visibility: initialData.visibility || initialData.eventVisibility || "OPEN_TO_ALL"
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // Clear error for the edited field
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = "Event title is required";
    } else if (formData.title.trim().length < 3 || formData.title.trim().length > 100) {
      errors.title = "Title must be between 3 and 100 characters";
    }

    if (!formData.venue.trim()) {
      errors.venue = "Venue / campus location is required";
    } else if (formData.venue.trim().length > 200) {
      errors.venue = "Venue cannot exceed 200 characters";
    }

    if (!formData.description.trim()) {
      errors.description = "Event description is required";
    } else if (formData.description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters";
    } else if (formData.description.trim().length > 2000) {
      errors.description = "Description cannot exceed 2000 characters";
    }

    if (!formData.startDateTime) {
      errors.startDateTime = "Start date and time is required";
    }

    if (!formData.endDateTime) {
      errors.endDateTime = "End date and time is required";
    }

    if (formData.startDateTime && formData.endDateTime) {
      const start = new Date(formData.startDateTime).getTime();
      const end = new Date(formData.endDateTime).getTime();
      if (end <= start) {
        errors.endDateTime = "End date/time must be after start date/time";
      }
    }

    if (!formData.visibility) {
      errors.visibility = "Please select event visibility";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Backend Error Message */}
      {serverError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1 font-medium">{serverError}</div>
        </div>
      )}

      {/* Main Event Details Card */}
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
            value={formData.title}
            onChange={handleChange}
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

        {/* Venue and Visibility Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="event-venue" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Venue / Location <span className="text-rose-500">*</span>
            </label>
            <input
              id="event-venue"
              name="venue"
              type="text"
              value={formData.venue}
              onChange={handleChange}
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
              value={formData.visibility}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors bg-white focus:outline-none focus:ring-2 ${
                fieldErrors.visibility
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
              }`}
            >
              {EVENT_VISIBILITIES.map((vis) => (
                <option key={vis.value} value={vis.value}>
                  {vis.label}
                </option>
              ))}
            </select>
            {fieldErrors.visibility && (
              <p className="text-xs text-rose-600 font-medium">{fieldErrors.visibility}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5 text-left">
          <div className="flex justify-between items-center">
            <label htmlFor="event-description" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Event Description <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-slate-400">{formData.description.length}/2000</span>
          </div>
          <textarea
            id="event-description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
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

      {/* Schedule Card */}
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
              value={formData.startDateTime}
              onChange={handleChange}
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
              value={formData.endDateTime}
              onChange={handleChange}
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

      {/* Action Buttons */}
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
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{submitLabel}</span>
          )}
        </button>
      </div>
    </form>
  );
}
