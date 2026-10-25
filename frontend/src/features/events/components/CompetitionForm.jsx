import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import {
  ACTIVITY_REGISTRATION_TYPES,
  ACTIVITY_TYPES,
  validateActivityForm
} from "../../activities/utils/activityHelpers";

import { EVENT_VISIBILITIES } from "../utils/eventHelpers";
import ApprovalSetting from "../../activities/components/ApprovalSetting";

const inputClassName = (hasError) =>
  `block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:opacity-60 ${
    hasError
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
  }`;

const sectionClassName =
  "space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6";

function Field({
  id,
  label,
  required = false,
  error,
  hint,
  children
}) {
  return (
    <div className="space-y-1.5">
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

export default function CompetitionForm({
  onSubmit,
  isSubmitting,
  serverError
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    location: "",
    visibility: "COLLEGE_ONLY",
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
    rules: ""
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const isTeamRegistration =
    formData.registrationType === "TEAM" ||
    formData.registrationType === "BOTH";

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  const handleRegistrationTypeChange = (event) => {
    const registrationType = event.target.value;

    setFormData((previous) => ({
      ...previous,
      registrationType,
      minTeamSize:
        registrationType === "INDIVIDUAL"
          ? ""
          : previous.minTeamSize,
      maxTeamSize:
        registrationType === "INDIVIDUAL"
          ? ""
          : previous.maxTeamSize
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

    const errors = validateActivityForm(formData);

    if (!formData.location.trim()) {
      errors.location = "Venue is required.";
    }

    if (!formData.visibility) {
      errors.visibility = "Visibility is required.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <section className={sectionClassName}>
        <div className="border-b border-slate-100 pb-2">
          <h2 className="text-base font-semibold text-slate-900">
            Competition details
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Tell participants what they are registering for.
          </p>
        </div>

        <Field
          id="competition-name"
          label="Name"
          required
          error={fieldErrors.name}
        >
          <input
            id="competition-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Code Storm Hackathon"
            disabled={isSubmitting}
            className={inputClassName(fieldErrors.name)}
          />
        </Field>

        <Field
          id="competition-description"
          label="Description"
          required
          error={fieldErrors.description}
          hint={`${formData.description.length}/2000 characters`}
        >
          <textarea
            id="competition-description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            placeholder="Explain the activity and who it is for."
            disabled={isSubmitting}
            className={inputClassName(fieldErrors.description)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="competition-type"
            label="Type"
            required
            error={fieldErrors.type}
          >
            <select
              id="competition-type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              disabled={isSubmitting}
              className={inputClassName(fieldErrors.type)}
            >
              <option value="">Select competition type</option>

              {ACTIVITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="competition-location"
            label="Venue"
            required
            error={fieldErrors.location}
          >
            <input
              id="competition-location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Innovation Lab or Online"
              disabled={isSubmitting}
              className={inputClassName(fieldErrors.location)}
            />
          </Field>
        </div>

        <Field
          id="competition-visibility"
          label="Eligibility & visibility"
          required
          error={fieldErrors.visibility}
        >
          <select
            id="competition-visibility"
            name="visibility"
            value={formData.visibility}
            onChange={handleChange}
            disabled={isSubmitting}
            className={inputClassName(fieldErrors.visibility)}
          >
            {EVENT_VISIBILITIES.map((visibility) => (
              <option
                key={visibility.value}
                value={visibility.value}
              >
                {visibility.label}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className={sectionClassName}>
        <div className="border-b border-slate-100 pb-2">
          <h2 className="text-base font-semibold text-slate-900">
            Schedule
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            ["startDateTime", "Start date & time"],
            ["endDateTime", "End date & time"],
            ["registrationDeadline", "Registration deadline"]
          ].map(([name, label]) => (
            <Field
              key={name}
              id={`competition-${name}`}
              label={label}
              required
              error={fieldErrors[name]}
              hint={
                name === "registrationDeadline"
                  ? "Must be before the competition starts."
                  : undefined
              }
            >
              <input
                id={`competition-${name}`}
                name={name}
                type="datetime-local"
                value={formData[name]}
                onChange={handleChange}
                disabled={isSubmitting}
                className={inputClassName(fieldErrors[name])}
              />
            </Field>
          ))}
        </div>
        <Field
          id="competition-check-in-window"
          label="Activity check-in opens before start"
        >
          <select
            id="competition-check-in-window"
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

      <section className={sectionClassName}>
        <div className="border-b border-slate-100 pb-2">
          <h2 className="text-base font-semibold text-slate-900">
            Registration
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Each individual or team registration uses one entry.
          </p>
        </div>

        <Field
          id="competition-registration-type"
          label="Registration type"
          required
          error={fieldErrors.registrationType}
          hint={
            formData.registrationType === "BOTH"
              ? "Participants may register individually or as a team."
              : undefined
          }
        >
          <select
            id="competition-registration-type"
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
              ["UNLIMITED", "Unlimited"],
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
              id="competition-capacity"
              label="Maximum entries"
              required
              error={fieldErrors.capacity}
              hint="One individual or one team counts as one entry."
            >
              <input
                id="competition-capacity"
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
              Unlimited entries until the registration deadline.
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
        />

        {isTeamRegistration && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-800">
                Team size
              </h3>

              {formData.registrationType === "BOTH" && (
                <p className="mt-1 text-xs text-slate-500">
                  These limits apply only to team registrations.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ["minTeamSize", "Minimum members per team"],
                ["maxTeamSize", "Maximum members per team"]
              ].map(([name, label]) => (
                <Field
                  key={name}
                  id={`competition-${name}`}
                  label={label}
                  required
                  error={fieldErrors[name]}
                >
                  <input
                    id={`competition-${name}`}
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

      <section className={sectionClassName}>
        <Field
          id="competition-rules"
          label="Rules"
          required
          error={fieldErrors.rules}
          hint={`${formData.rules.length}/5000 characters`}
        >
          <textarea
            id="competition-rules"
            name="rules"
            rows={4}
            value={formData.rules}
            onChange={handleChange}
            placeholder="Add eligibility, submission and participation rules."
            disabled={isSubmitting}
            className={inputClassName(fieldErrors.rules)}
          />
        </Field>
      </section>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}

          {isSubmitting
            ? "Creating competition..."
            : "Create Competition"}
        </button>
      </div>
    </form>
  );
}