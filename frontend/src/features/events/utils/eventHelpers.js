// Event Visibility Options
export const EVENT_VISIBILITIES = [
  { value: "OPEN_TO_ALL", label: "Open to All Colleges" },
  { value: "COLLEGE_ONLY", label: "College Only (Internal)" }
];

// Event Status Labels
export const EVENT_STATUS_LABELS = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

// Date Format Helpers

/**
 * Formats ISO string (e.g. 2026-08-20T10:00:00) into readable date & time.
 * Example: "Aug 20, 2026, 10:00 AM"
 */
export function formatDateTime(isoString) {
  if (!isoString) return "N/A";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Formats start and end date into a clean, simple date range
 * Example: "Aug 20, 2026 · 10:00 AM – 6:00 PM" or "Aug 20 – Aug 22, 2026"
 */
export function formatDateRange(startIso, endIso) {
  if (!startIso) return "Date not set";
  try {
    const start = new Date(startIso);
    if (isNaN(start.getTime())) return startIso;

    if (!endIso) {
      return formatDateTime(startIso);
    }

    const end = new Date(endIso);
    if (isNaN(end.getTime())) return formatDateTime(startIso);

    const isSameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();

    if (isSameDay) {
      const datePart = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(start);

      const startTime = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }).format(start);

      const endTime = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }).format(end);

      return `${datePart} · ${startTime} – ${endTime}`;
    }

    const startFormatted = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined
    }).format(start);

    const endFormatted = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(end);

    return `${startFormatted} – ${endFormatted}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}

/**
 * Converts ISO string to input format `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">`
 */
export function toInputDateTime(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return isoString.slice(0, 16);
    }
    const pad = (num) => String(num).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

/**
 * Converts datetime-local input string to ISO format expected by backend
 */
export function toIsoDateTime(inputVal) {
  if (!inputVal) return null;
  if (inputVal.length === 16) {
    return `${inputVal}:00`;
  }
  return inputVal;
}

/**
 * Formats visibility code to readable text
 */
export function getVisibilityLabel(visibility) {
  const match = EVENT_VISIBILITIES.find((v) => v.value === visibility);
  return match ? match.label : visibility || "Open to All";
}

// Re-export Activity types and helpers for convenient access
export {
  ACTIVITY_TYPES,
  ACTIVITY_REGISTRATION_TYPES,
  getActivityTypeLabel,
  getActivityTypeBadgeStyle,
  formatCapacitySummary,
  validateActivityForm
} from "../../activities/utils/activityHelpers";
