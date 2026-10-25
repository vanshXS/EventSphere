import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, Loader2, Plus } from "lucide-react";

import {
  ACTIVITY_TYPES,
  ACTIVITY_REGISTRATION_TYPES,
  validateActivityForm
} from "../utils/activityHelpers";

import { toInputDateTime } from "../../events/utils/eventHelpers";
import { createActivity, updateActivity } from "../activityApi";
import ApprovalSetting from "./ApprovalSetting";

const inputClassName = (hasError) =>
  `block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:opacity-60 ${
    hasError
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
  }`;

const emptyForm = {
  name: "",
  description: "",
  type: "",
  location: "",
  startDateTime: "",
  endDateTime: "",
  checkInOpensMinutesBeforeStart: "30",
  registrationDeadline: "",
  registrationType: "INDIVIDUAL",
  requiresApproval: false,
  registrationLimit: "UNLIMITED",
  capacity: "",
  minTeamSize: "",
  maxTeamSize: "",
  rules: "",
  visibility: ""
};

function Field({
  id,
  label,
  required = false,
  error,
  hint,
  children
}) {
  return (
    <div className="space-y-1.5 text-left">
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-slate-700"
      >
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>

      {children}

      {hint && <p className="text-xs text-slate-500">{hint}</p>}

      {error && (
        <p className="text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ActivityFormModal({
  isOpen,
  eventId = null,
  parentEvent = null,
  editingActivity = null,
  editingIndex = null,
  onClose,
  onActivityCreated,
  onActivityAdded
}) {
  const [formData, setFormData] = useState({ ...emptyForm });
  const [sameVenue, setSameVenue] = useState(false);
  const [sameSchedule, setSameSchedule] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (editingActivity) {
      setFormData({
        ...emptyForm,
        name: editingActivity.name || "",
        description: editingActivity.description || "",
        type: editingActivity.type || "",
        location: editingActivity.location || "",
        startDateTime: editingActivity.startDateTime
          ? toInputDateTime(editingActivity.startDateTime)
          : "",
        endDateTime: editingActivity.endDateTime
          ? toInputDateTime(editingActivity.endDateTime)
          : "",
        checkInOpensMinutesBeforeStart: String(
          editingActivity.checkInOpensMinutesBeforeStart ?? 30
        ),
        registrationDeadline: editingActivity.registrationDeadline
          ? toInputDateTime(editingActivity.registrationDeadline)
          : "",
        registrationType:
          editingActivity.registrationType || "INDIVIDUAL",
        requiresApproval: editingActivity.requiresApproval === true,
        registrationLimit:
          editingActivity.capacity == null ? "UNLIMITED" : "LIMITED",
        capacity:
          editingActivity.capacity != null
            ? String(editingActivity.capacity)
            : "",
        minTeamSize:
          editingActivity.minTeamSize != null
            ? String(editingActivity.minTeamSize)
            : "",
        maxTeamSize:
          editingActivity.maxTeamSize != null
            ? String(editingActivity.maxTeamSize)
            : "",
        rules: editingActivity.rules || "",
        visibility: editingActivity.visibility || ""
      });

      setSameVenue(
        Boolean(
          parentEvent?.venue &&
            editingActivity.location === parentEvent.venue
        )
      );

      setSameSchedule(
        Boolean(
          parentEvent?.startDateTime &&
            parentEvent?.endDateTime &&
            toInputDateTime(editingActivity.startDateTime) ===
              toInputDateTime(parentEvent.startDateTime) &&
            toInputDateTime(editingActivity.endDateTime) ===
              toInputDateTime(parentEvent.endDateTime)
        )
      );
    } else {
      const startDateTime = parentEvent?.startDateTime
        ? toInputDateTime(parentEvent.startDateTime)
        : "";

      const endDateTime = parentEvent?.endDateTime
        ? toInputDateTime(parentEvent.endDateTime)
        : "";

      setFormData({
        ...emptyForm,
        description: parentEvent?.description || "",
        location: parentEvent?.venue || "",
        startDateTime,
        endDateTime
      });

      setSameVenue(Boolean(parentEvent?.venue));
      setSameSchedule(Boolean(startDateTime && endDateTime));
    }

    setFieldErrors({});
    setServerError("");
  }, [isOpen, parentEvent, editingActivity]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isSubmitting, onClose]);

  const clearFieldError = (name) => {
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

    clearFieldError(name);
  };

  const handleToggleSameVenue = (event) => {
    const checked = event.target.checked;
    setSameVenue(checked);

    if (checked && parentEvent?.venue) {
      setFormData((previous) => ({
        ...previous,
        location: parentEvent.venue
      }));

      clearFieldError("location");
    }
  };

  const handleToggleSameSchedule = (event) => {
    const checked = event.target.checked;
    setSameSchedule(checked);

    if (checked && parentEvent) {
      setFormData((previous) => ({
        ...previous,
        startDateTime: parentEvent.startDateTime
          ? toInputDateTime(parentEvent.startDateTime)
          : previous.startDateTime,
        endDateTime: parentEvent.endDateTime
          ? toInputDateTime(parentEvent.endDateTime)
          : previous.endDateTime
      }));

      setFieldErrors((previous) => {
        const next = { ...previous };
        delete next.startDateTime;
        delete next.endDateTime;
        return next;
      });
    }
  };

  const handleRegistrationTypeChange = (event) => {
    const registrationType = event.target.value;

    setFormData((previous) => ({
      ...previous,
      registrationType,
      minTeamSize:
        registrationType === "INDIVIDUAL"
          ? ""
          : previous.minTeamSize || "2",
      maxTeamSize:
        registrationType === "INDIVIDUAL"
          ? ""
          : previous.maxTeamSize || "4"
    }));

    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next.registrationType;
      delete next.minTeamSize;
      delete next.maxTeamSize;
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    setServerError("");

    const errors = validateActivityForm(formData, parentEvent);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    // New event: the parent page saves these after creating the event.
    if (!eventId && onActivityAdded) {
      onActivityAdded(formData, editingIndex);
      onClose();
      return;
    }

    setIsSubmitting(true);

    try {
      const saved = editingActivity
        ? await updateActivity(eventId, editingActivity.id, formData)
        : await createActivity(eventId, formData);

      onActivityCreated?.(saved);
      onClose();
    } catch (error) {
      const response = error.response?.data;

      setServerError(
        response?.message ||
          (response?.validationErrors &&
            Object.values(response.validationErrors)[0]) ||
          "Could not save the activity. Please check the fields and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isTeamRegistration =
    formData.registrationType === "TEAM" ||
    formData.registrationType === "BOTH";

  const scheduleFields = [
    {
      name: "startDateTime",
      id: "activity-start",
      label: "Start date & time"
    },
    {
      name: "endDateTime",
      id: "activity-end",
      label: "End date & time"
    },
    {
      name: "registrationDeadline",
      id: "activity-deadline",
      label: "Registration deadline"
    }
  ];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2
              id="activity-modal-title"
              className="text-xl font-bold text-slate-900"
            >
              {editingActivity ? "Edit Activity" : "Add Activity to Event"}
            </h2>

            {parentEvent?.title && (
              <p className="mt-0.5 text-xs text-slate-500">
                Event:{" "}
                <span className="font-semibold text-slate-700">
                  {parentEvent.title}
                </span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close activity form"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5 overflow-y-auto p-5 sm:p-6"
        >
          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <Field
            id="activity-name"
            label="Activity name"
            required
            error={fieldErrors.name}
          >
            <input
              id="activity-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Code Storm Hackathon"
              disabled={isSubmitting}
              className={inputClassName(fieldErrors.name)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="activity-type"
              label="Activity type"
              required
              error={fieldErrors.type}
            >
              <select
                id="activity-type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                disabled={isSubmitting}
                className={inputClassName(fieldErrors.type)}
              >
                <option value="">Select activity type</option>

                {ACTIVITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="space-y-2">
              <Field
                id="activity-location"
                label="Sub-venue / room"
                error={fieldErrors.location}
              >
                <input
                  id="activity-location"
                  name="location"
                  value={formData.location}
                  onChange={(event) => {
                    setSameVenue(false);
                    handleChange(event);
                  }}
                  placeholder="e.g. Computer Lab 2"
                  disabled={isSubmitting}
                  className={inputClassName(fieldErrors.location)}
                />
              </Field>

              {parentEvent?.venue && (
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-indigo-700">
                  <input
                    type="checkbox"
                    checked={sameVenue}
                    onChange={handleToggleSameVenue}
                    disabled={isSubmitting}
                    className="accent-indigo-600"
                  />
                  Same venue as event
                </label>
              )}
            </div>
          </div>

          {!parentEvent && (
            <Field
              id="activity-visibility"
              label="Visibility"
              required
              error={fieldErrors.visibility}
            >
              <select
                id="activity-visibility"
                name="visibility"
                value={formData.visibility}
                onChange={handleChange}
                disabled={isSubmitting}
                className={inputClassName(fieldErrors.visibility)}
              >
                <option value="">Select visibility</option>
                <option value="COLLEGE_ONLY">College Only</option>
                <option value="OPEN_TO_ALL">Open to All</option>
              </select>
            </Field>
          )}

          <Field
            id="activity-description"
            label="Description"
            required
            error={fieldErrors.description}
            hint={`${formData.description.length}/2000 characters`}
          >
            <textarea
              id="activity-description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="What will participants do in this activity?"
              disabled={isSubmitting}
              className={inputClassName(fieldErrors.description)}
            />
          </Field>

          <section className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Schedule & timeline
              </h3>

              {parentEvent?.startDateTime && parentEvent?.endDateTime && (
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-indigo-700">
                  <input
                    type="checkbox"
                    checked={sameSchedule}
                    onChange={handleToggleSameSchedule}
                    disabled={isSubmitting}
                    className="accent-indigo-600"
                  />
                  Same as event dates
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {scheduleFields.map(({ name, id, label }) => (
                <Field
                  key={name}
                  id={id}
                  label={label}
                  required
                  error={fieldErrors[name]}
                  hint={
                    name === "registrationDeadline"
                      ? "Must be before the activity starts."
                      : undefined
                  }
                >
                  <input
                    id={id}
                    name={name}
                    type="datetime-local"
                    value={formData[name]}
                    onChange={(event) => {
                      if (name !== "registrationDeadline") {
                        setSameSchedule(false);
                      }
                      handleChange(event);
                    }}
                    max={
                      name === "registrationDeadline"
                        ? formData.startDateTime || undefined
                        : undefined
                    }
                    disabled={isSubmitting}
                    className={inputClassName(fieldErrors[name])}
                  />
                </Field>
              ))}
            </div>
            <Field
              id="activity-check-in-window"
              label="Activity check-in opens before start"
            >
              <select
                id="activity-check-in-window"
                name="checkInOpensMinutesBeforeStart"
                value={formData.checkInOpensMinutesBeforeStart}
                onChange={handleChange}
                disabled={isSubmitting}
                className={inputClassName(false)}
              >
                <option value="0">At start time</option>
                <option value="15">15 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">60 minutes before</option>
                <option value="120">120 minutes before</option>
              </select>
            </Field>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Registration & capacity
            </h3>

            <Field
              id="activity-registration-type"
              label="Registration type"
              required
              error={fieldErrors.registrationType}
              hint={
                formData.registrationType === "BOTH"
                  ? "Participants can enter individually or as a team."
                  : undefined
              }
            >
              <select
                id="activity-registration-type"
                name="registrationType"
                value={formData.registrationType}
                onChange={handleRegistrationTypeChange}
                disabled={isSubmitting}
                className={inputClassName(fieldErrors.registrationType)}
              >
                {ACTIVITY_REGISTRATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-xs font-semibold text-slate-700">
                Registration limit
              </legend>

              <div className="flex gap-4 text-sm text-slate-700">
                {[
                  ["UNLIMITED", "No limit"],
                  ["LIMITED", "Limited"]
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="inline-flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="radio"
                      name="registrationLimit"
                      value={value}
                      checked={formData.registrationLimit === value}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="accent-indigo-600"
                    />
                    {label}
                  </label>
                ))}
              </div>

              {formData.registrationLimit === "LIMITED" ? (
                <Field
                  id="activity-capacity"
                  label="Maximum entries"
                  required
                  error={fieldErrors.capacity}
                  hint="One individual or one team counts as one entry."
                >
                  <input
                    id="activity-capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.capacity}
                    onChange={handleChange}
                    placeholder="e.g. 50"
                    disabled={isSubmitting}
                    className={inputClassName(fieldErrors.capacity)}
                  />
                </Field>
              ) : (
                <p className="text-xs text-slate-500">
                  No entry limit until the registration deadline.
                </p>
              )}
            </fieldset>

            <ApprovalSetting
              checked={formData.requiresApproval}
              onChange={(checked) =>
                setFormData((previous) => ({
                  ...previous,
                  requiresApproval: checked
                }))
              }
              disabled={isSubmitting}
              editing={Boolean(editingActivity)}
            />

            {isTeamRegistration && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Team size
                  </h4>

                  {formData.registrationType === "BOTH" && (
                    <p className="mt-1 text-xs text-slate-500">
                      These limits apply only to team entries.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    ["minTeamSize", "Minimum members"],
                    ["maxTeamSize", "Maximum members"]
                  ].map(([name, label]) => (
                    <Field
                      key={name}
                      id={`activity-${name}`}
                      label={label}
                      required
                      error={fieldErrors[name]}
                    >
                      <input
                        id={`activity-${name}`}
                        name={name}
                        type="number"
                        min="1"
                        step="1"
                        value={formData[name]}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={inputClassName(fieldErrors[name])}
                      />
                    </Field>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="border-t border-slate-100 pt-4">
            <Field
              id="activity-rules"
              label="Rules & guidelines"
              required
              error={fieldErrors.rules}
              hint={`${formData.rules.length}/5000 characters`}
            >
              <textarea
                id="activity-rules"
                name="rules"
                rows={4}
                value={formData.rules}
                onChange={handleChange}
                placeholder="Add eligibility, participation and submission rules."
                disabled={isSubmitting}
                className={inputClassName(fieldErrors.rules)}
              />
            </Field>
          </section>

          <footer className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}

              {isSubmitting
                ? "Saving..."
                : editingActivity
                ? "Update Activity"
                : eventId
                ? "Save Activity"
                : "Add to Event"}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  );
}