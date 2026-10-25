export const displayStatus = (status) => {
  if (!status) return "Not set";
  return String(status)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const formatDateTime = (value) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const formatScheduledDateTime = (value) => {
  if (!value) return "Not scheduled";
  const localDateTime = String(value).slice(0, 19);
  const date = new Date(`${localDateTime}Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const getLocalTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";

export const toDateTimeLocalValue = (value) => (value ? String(value).slice(0, 16) : "");

export const getEntryType = (entry) => {
  const explicit = entry?.entryType || entry?.registrationType;
  if (explicit === "TEAM" || entry?.teamId) return "TEAM";
  if (explicit === "INDIVIDUAL" || entry?.participantId) return "INDIVIDUAL";
  return "UNKNOWN";
};

export const getEvaluationState = (entry) => {
  const status = entry?.myEvaluationStatus || entry?.evaluationStatus;
  if (status === "SUBMITTED") return "SUBMITTED";
  if (status === "DRAFT") return "DRAFT";
  return "NOT_STARTED";
};

export const getCriteriaId = (criterion) => criterion?.id || criterion?.criterionId;

export const getScoreNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
