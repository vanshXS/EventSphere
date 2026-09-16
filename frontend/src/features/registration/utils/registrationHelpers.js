export const normalizeRegistrationStatus = (status) =>
  status === "REGISTERED" ? "APPROVED" : status;

export const isActiveRegistration = (registration) =>
  ["PENDING", "APPROVED"].includes(
    normalizeRegistrationStatus(registration?.status)
  );

export const blocksRegistration = (registration) =>
  isActiveRegistration(registration) ||
  registration?.status === "REJECTED";

// Prefer an active entry over an older cancelled/rejected record.
export function getActivityRegistration(registrations, activityId) {
  const matches = registrations.filter(
    (registration) => registration.activityId === activityId
  );

  return (
    matches.find(isActiveRegistration) ||
    matches.find((registration) => registration.status === "REJECTED") ||
    null
  );
}

export function getRegistrationMessage(registration) {
  switch (normalizeRegistrationStatus(registration?.status)) {
    case "PENDING":
      return "Request submitted. Waiting for organizer approval.";

    case "APPROVED":
      return "Registration approved. You're on the list.";

    case "REJECTED":
      return "Your registration request was rejected.";

    default:
      return "Registration saved. Check My Registrations for its status.";
  }
}
