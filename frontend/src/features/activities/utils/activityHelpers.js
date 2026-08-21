// Enum Constants & Display Labels for Activities

export const ACTIVITY_TYPES = [
  { value: "HACKATHON", label: "Hackathon" },
  { value: "TECHNICAL_COMPETITION", label: "Competition" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "SEMINAR", label: "Seminar" },
  { value: "CULTURAL", label: "Cultural" },
  { value: "SPORTS", label: "Sports" },
  { value: "OTHER", label: "Other" }
];

export const ACTIVITY_REGISTRATION_TYPES = [
  { 
    value: "INDIVIDUAL", 
    label: "Individual Only",
    description: "Participants register on an individual basis."
  },
  { 
    value: "TEAM", 
    label: "Team Only",
    description: "Participants must form a team within min/max size limits."
  },
  { 
    value: "BOTH", 
    label: "Individual or Team",
    description: "Supports either individual registrations or teams."
  }
];

/**
 * Gets human readable label for activity type
 */
export function getActivityTypeLabel(type) {
  const match = ACTIVITY_TYPES.find((t) => t.value === type);
  return match ? match.label : type || "Activity";
}

/**
 * Returns Tailwind badge styling classes based on activity type
 */
export function getActivityTypeBadgeStyle(type) {
  switch (type) {
    case "HACKATHON":
      return "bg-purple-50 text-purple-700 border-purple-200/80";
    case "TECHNICAL_COMPETITION":
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    case "WORKSHOP":
      return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
    case "SEMINAR":
      return "bg-sky-50 text-sky-700 border-sky-200/80";
    case "SPORTS":
      return "bg-orange-50 text-orange-700 border-orange-200/80";
    case "CULTURAL":
      return "bg-pink-50 text-pink-700 border-pink-200/80";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

/**
 * Formats capacity and team size text for clear display on cards
 * Examples:
 * - "Individual · 50 participants"
 * - "Team · 30 teams (2–4 members)"
 * - "Individual / Team · 40 slots (2–5 members for teams)"
 */
export function formatCapacitySummary(registrationType, capacity, minTeamSize, maxTeamSize) {
  const cap = capacity ?? "Unlimited";

  if (registrationType === "INDIVIDUAL") {
    return {
      typeText: "Individual registration",
      capacityText: `${cap} participants`,
      teamText: null
    };
  }

  if (registrationType === "TEAM") {
    const teamSizeText = minTeamSize && maxTeamSize
      ? minTeamSize === maxTeamSize
        ? `${minTeamSize} members/team`
        : `${minTeamSize}–${maxTeamSize} members/team`
      : "";

    return {
      typeText: "Team registration",
      capacityText: `${cap} teams`,
      teamText: teamSizeText
    };
  }

  if (registrationType === "BOTH") {
    const teamSizeText = minTeamSize && maxTeamSize
      ? minTeamSize === maxTeamSize
        ? `${minTeamSize} members if team`
        : `${minTeamSize}–${maxTeamSize} members if team`
      : "";

    return {
      typeText: "Individual or Team",
      capacityText: `${cap} total slots`,
      teamText: teamSizeText
    };
  }

  return {
    typeText: "Registration",
    capacityText: `${cap} slots`,
    teamText: null
  };
}

/**
 * Validates activity form data against backend requirements and parent event boundaries
 */
export function validateActivityForm(formData, parentEvent = null) {
  const errors = {};

  // 1. Name validation (3-100 chars)
  if (!formData.name?.trim()) {
    errors.name = "Activity name is required";
  } else if (formData.name.trim().length < 3 || formData.name.trim().length > 100) {
    errors.name = "Activity name must be between 3 and 100 characters";
  }

  // 2. Description validation (10-2000 chars)
  if (!formData.description?.trim()) {
    errors.description = "Activity description is required";
  } else if (formData.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters";
  } else if (formData.description.trim().length > 2000) {
    errors.description = "Description cannot exceed 2000 characters";
  }

  // 3. Activity Type
  if (!formData.type) {
    errors.type = "Please select an activity type";
  }

  // 4. Rules (10-5000 chars)
  if (!formData.rules?.trim()) {
    errors.rules = "Activity rules and regulations are required";
  } else if (formData.rules.trim().length < 10) {
    errors.rules = "Rules must be at least 10 characters";
  } else if (formData.rules.trim().length > 5000) {
    errors.rules = "Rules cannot exceed 5000 characters";
  }

  // 5. Location (optional, max 200 chars)
  if (formData.location && formData.location.trim().length > 200) {
    errors.location = "Location cannot exceed 200 characters";
  }

  // 6. Schedule Timelines
  if (!formData.startDateTime) {
    errors.startDateTime = "Start date and time is required";
  }

  if (!formData.endDateTime) {
    errors.endDateTime = "End date and time is required";
  }

  if (!formData.registrationDeadline) {
    errors.registrationDeadline = "Registration deadline is required";
  }

  if (formData.startDateTime && formData.endDateTime) {
    const start = new Date(formData.startDateTime).getTime();
    const end = new Date(formData.endDateTime).getTime();
    if (end <= start) {
      errors.endDateTime = "End date/time must be after start date/time";
    }
  }

  if (formData.startDateTime && formData.registrationDeadline) {
    const start = new Date(formData.startDateTime).getTime();
    const deadline = new Date(formData.registrationDeadline).getTime();
    if (deadline > start) {
      errors.registrationDeadline = "Registration deadline must be on or before activity start date/time";
    }
  }

  // Parent Event Boundary Check (if parent event provided)
  if (parentEvent) {
    if (parentEvent.startDateTime && formData.startDateTime) {
      const eventStart = new Date(parentEvent.startDateTime).getTime();
      const activityStart = new Date(formData.startDateTime).getTime();
      if (activityStart < eventStart) {
        errors.startDateTime = "Activity cannot start before the parent event starts";
      }
    }

    if (parentEvent.endDateTime && formData.endDateTime) {
      const eventEnd = new Date(parentEvent.endDateTime).getTime();
      const activityEnd = new Date(formData.endDateTime).getTime();
      if (activityEnd > eventEnd) {
        errors.endDateTime = "Activity cannot end after the parent event ends";
      }
    }
  }

  // 7. Registration Type & Capacity
  if (!formData.registrationType) {
    errors.registrationType = "Please select a registration type";
  }

  const capacityNum = parseInt(formData.capacity, 10);
  if (formData.capacity === "" || formData.capacity === null || formData.capacity === undefined) {
    errors.capacity = "Capacity is required";
  } else if (isNaN(capacityNum) || capacityNum <= 0) {
    errors.capacity = "Capacity must be a positive number greater than 0";
  }

  // 8. Team Size Validation (for TEAM or BOTH)
  if (formData.registrationType === "TEAM" || formData.registrationType === "BOTH") {
    const minTeam = parseInt(formData.minTeamSize, 10);
    const maxTeam = parseInt(formData.maxTeamSize, 10);

    if (!formData.minTeamSize || isNaN(minTeam)) {
      errors.minTeamSize = "Minimum team size is required";
    } else if (minTeam < 1) {
      errors.minTeamSize = "Minimum team size must be at least 1";
    }

    if (!formData.maxTeamSize || isNaN(maxTeam)) {
      errors.maxTeamSize = "Maximum team size is required";
    } else if (maxTeam < 1) {
      errors.maxTeamSize = "Maximum team size must be at least 1";
    } else if (!isNaN(minTeam) && maxTeam < minTeam) {
      errors.maxTeamSize = "Maximum team size cannot be smaller than minimum team size";
    }
  }

  return errors;
}
