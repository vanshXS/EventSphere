import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  ACTIVITY_REGISTRATION_TYPES,
  ACTIVITY_TYPES,
  validateActivityForm
} from "../../activities/utils/activityHelpers";
import { EVENT_VISIBILITIES } from "../../events/utils/eventHelpers";

const inputClassName = (hasError) =>
  `block w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
    hasError
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600/20"
  }`;

function validateEventDetails(activityData) {
  const errors = {};

  if (!activityData.name.trim()) {
    errors.name = "Name is required";
  } else if (activityData.name.trim().length < 3 || activityData.name.trim().length > 100) {
    errors.name = "Name must be between 3 and 100 characters";
  }

  if (!activityData.description.trim()) {
    errors.description = "Description is required";
  } else if (activityData.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters";
  } else if (activityData.description.trim().length > 2000) {
    errors.description = "Description cannot exceed 2000 characters";
  }

  if (!activityData.location.trim()) {
    errors.location = "Venue is required";
  } else if (activityData.location.trim().length > 200) {
    errors.location = "Venue cannot exceed 200 characters";
  }

  if (!activityData.visibility) {
    errors.visibility = "Visibility is required";
  }

  if (!activityData.startDateTime) {
    errors.startDateTime = "Start date and time is required";
  }

  if (!activityData.endDateTime) {
    errors.endDateTime = "End date and time is required";
  }

  if (activityData.startDateTime && activityData.endDateTime) {
    const start = new Date(activityData.startDateTime).getTime();
    const end = new Date(activityData.endDateTime).getTime();
    if (end <= start) {
      errors.endDateTime = "End date/time must be after start date/time";
    }
  }

  return errors;
}

function FieldError({ message }) {
  return message ? <p className="text-xs text-rose-600 font-medium">{message}</p> : null;
}

export default function CompetitionForm({ onSubmit, isSubmitting, serverError }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    location: "",
    visibility: "COLLEGE_ONLY",
    startDateTime: "",
    endDateTime: "",
    registrationDeadline: "",
    registrationType: "INDIVIDUAL",
    registrationLimit: "UNLIMITED",
    capacity: "",
    minTeamSize: "",
    maxTeamSize: "",
    rules: ""
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const isTeamRegistration =
    formData.registrationType === "TEAM" || formData.registrationType === "BOTH";
  const capacityLabel =
    formData.registrationType === "TEAM"
      ? "Maximum team registrations"
      : formData.registrationType === "BOTH"
      ? "Maximum combined registrations"
      : "Maximum individual registrations";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((previous) => {
        const next = { ...previous };
        delete next[name];
        return next;
      });
    }
  };

  const handleRegistrationTypeChange = (event) => {
    const registrationType = event.target.value;
    setFormData((previous) => ({
      ...previous,
      registrationType,
      minTeamSize: registrationType === "INDIVIDUAL" ? "" : previous.minTeamSize,
      maxTeamSize: registrationType === "INDIVIDUAL" ? "" : previous.maxTeamSize
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

    const eventErrors = validateEventDetails(formData);
    const activityErrors = validateActivityForm(formData, {
      startDateTime: formData.startDateTime,
      endDateTime: formData.endDateTime
    });
    const errors = { ...activityErrors, ...eventErrors };

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {serverError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1 font-medium">{serverError}</div>
        </div>
      )}

      <section className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="pb-2 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Competition details</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tell participants what they are registering for.
          </p>
        </div>

        <div className="space-y-1.5 text-left">
          <label htmlFor="competition-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="competition-name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Smart India Hackathon – Internal Round"
            disabled={isSubmitting}
            className={inputClassName(fieldErrors.name)}
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="space-y-1.5 text-left">
          <div className="flex justify-between items-center">
            <label htmlFor="competition-description" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Description <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-slate-400">{formData.description.length}/2000</span>
          </div>
          <textarea
            id="competition-description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            placeholder="Explain what the competition is about and who it is for."
            disabled={isSubmitting}
            className={inputClassName(fieldErrors.description)}
          />
          <FieldError message={fieldErrors.description} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="competition-type" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Type <span className="text-rose-500">*</span>
            </label>
            <select
              id="competition-type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`${inputClassName(fieldErrors.type)} bg-white`}
            >
              <option value="">Select competition type</option>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <FieldError message={fieldErrors.type} />
          </div>

          <div className="space-y-1.5 text-left">
            <label htmlFor="competition-venue" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Venue <span className="text-rose-500">*</span>
            </label>
            <input
              id="competition-venue"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Innovation Lab or Online"
              disabled={isSubmitting}
              className={inputClassName(fieldErrors.location)}
            />
            <FieldError message={fieldErrors.location} />
          </div>

          <div className="space-y-1.5 text-left sm:col-span-2">
            <label htmlFor="competition-visibility" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Eligibility & Visibility <span className="text-rose-500">*</span>
            </label>
            <select
              id="competition-visibility"
              name="visibility"
              value={formData.visibility}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`${inputClassName(fieldErrors.visibility)} bg-white`}
            >
              {EVENT_VISIBILITIES.map((vis) => (
                <option key={vis.value} value={vis.value}>
                  {vis.label}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.visibility} />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="pb-2 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Schedule</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="competition-start" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Start date & time <span className="text-rose-500">*</span>
            </label>
            <input
              id="competition-start"
              name="startDateTime"
              type="datetime-local"
              value={formData.startDateTime}
              onChange={handleChange}
              disabled={isSubmitting}
              className={inputClassName(fieldErrors.startDateTime)}
            />
            <FieldError message={fieldErrors.startDateTime} />
          </div>
          <div className="space-y-1.5 text-left">
            <label htmlFor="competition-end" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              End date & time <span className="text-rose-500">*</span>
            </label>
            <input
              id="competition-end"
              name="endDateTime"
              type="datetime-local"
              value={formData.endDateTime}
              onChange={handleChange}
              disabled={isSubmitting}
              className={inputClassName(fieldErrors.endDateTime)}
            />
            <FieldError message={fieldErrors.endDateTime} />
          </div>
        </div>

        <div className="space-y-1.5 text-left">
          <label htmlFor="competition-deadline" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Registration deadline <span className="text-rose-500">*</span>
          </label>
          <input
            id="competition-deadline"
            name="registrationDeadline"
            type="datetime-local"
            value={formData.registrationDeadline}
            onChange={handleChange}
            disabled={isSubmitting}
            className={inputClassName(fieldErrors.registrationDeadline)}
          />
          <FieldError message={fieldErrors.registrationDeadline} />
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="pb-2 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Registration</h2>
          <p className="text-xs text-slate-500 mt-0.5">Each individual or team registration uses one slot.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="competition-registration-type" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Registration type <span className="text-rose-500">*</span>
            </label>
            <select
              id="competition-registration-type"
              name="registrationType"
              value={formData.registrationType}
              onChange={handleRegistrationTypeChange}
              disabled={isSubmitting}
              className={`${inputClassName(fieldErrors.registrationType)} bg-white`}
            >
              {ACTIVITY_REGISTRATION_TYPES.map((registrationType) => (
                <option key={registrationType.value} value={registrationType.value}>
                  {registrationType.label}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.registrationType} />
            {formData.registrationType === "BOTH" && (
              <p className="text-xs text-slate-500">Participants may register individually or as a team.</p>
            )}
          </div>

          <fieldset className="space-y-2 text-left">
            <legend className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Registration limit</legend>
            <label className="mr-4 text-sm text-slate-700"><input className="mr-1.5" type="radio" name="registrationLimit" value="UNLIMITED" checked={formData.registrationLimit === "UNLIMITED"} onChange={handleChange} />Unlimited</label>
            <label className="text-sm text-slate-700"><input className="mr-1.5" type="radio" name="registrationLimit" value="LIMITED" checked={formData.registrationLimit === "LIMITED"} onChange={handleChange} />Limited</label>
            {formData.registrationLimit === "UNLIMITED" ? <p className="text-xs text-slate-500">Unlimited registrations until the registration deadline.</p> : <>
            <label htmlFor="competition-capacity" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              {capacityLabel} <span className="text-rose-500">*</span>
            </label>
            <input
              id="competition-capacity"
              name="capacity"
              type="number"
              min="1"
              step="1"
              value={formData.capacity}
              onChange={handleChange}
              placeholder={formData.registrationType === "TEAM" ? "e.g. 30 teams" : "e.g. 50"}
              disabled={isSubmitting}
              className={inputClassName(fieldErrors.capacity)}
            />
            <FieldError message={fieldErrors.capacity} />
            </>}
          </fieldset>
        </div>

        {isTeamRegistration && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-800">Team size</h3>
              {formData.registrationType === "BOTH" && (
                <p className="text-xs text-slate-500 mt-0.5">These limits apply only to team registrations.</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label htmlFor="competition-min-team" className="block text-xs font-medium text-slate-700">
                  Minimum members per team <span className="text-rose-500">*</span>
                </label>
                <input
                  id="competition-min-team"
                  name="minTeamSize"
                  type="number"
                  min="1"
                  value={formData.minTeamSize}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={inputClassName(fieldErrors.minTeamSize)}
                />
                <FieldError message={fieldErrors.minTeamSize} />
              </div>
              <div className="space-y-1.5 text-left">
                <label htmlFor="competition-max-team" className="block text-xs font-medium text-slate-700">
                  Maximum members per team <span className="text-rose-500">*</span>
                </label>
                <input
                  id="competition-max-team"
                  name="maxTeamSize"
                  type="number"
                  min="1"
                  value={formData.maxTeamSize}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={inputClassName(fieldErrors.maxTeamSize)}
                />
                <FieldError message={fieldErrors.maxTeamSize} />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="competition-rules" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Rules <span className="text-rose-500">*</span>
          </label>
          <span className="text-xs text-slate-400">{formData.rules.length}/5000</span>
        </div>
        <textarea
          id="competition-rules"
          name="rules"
          rows={4}
          value={formData.rules}
          onChange={handleChange}
          placeholder="Add eligibility, submission, and participation rules."
          disabled={isSubmitting}
          className={inputClassName(fieldErrors.rules)}
        />
        <FieldError message={fieldErrors.rules} />
      </section>

      <div className="pt-2 flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 shadow-xs"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          <span>{isSubmitting ? "Creating competition..." : "Create Competition"}</span>
        </button>
      </div>
    </form>
  );
}
