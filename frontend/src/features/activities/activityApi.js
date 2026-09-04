import api from "../../lib/api";
import { toIsoDateTime } from "../events/utils/eventHelpers";

/**
 * Normalizes form state into backend CreateActivityRequest payload
 */
export const formatActivityPayload = (formData) => {
  const isIndividual = formData.registrationType === "INDIVIDUAL";

  const payload = {
    name: formData.name?.trim(),
    description: formData.description?.trim(),
    type: formData.type,
    rules: formData.rules?.trim(),
    location: formData.location?.trim() || null,
    startDateTime: toIsoDateTime(formData.startDateTime),
    endDateTime: toIsoDateTime(formData.endDateTime),
    registrationDeadline: toIsoDateTime(formData.registrationDeadline),
    registrationType: formData.registrationType,
    capacity: formData.registrationLimit === "LIMITED" ? Number(formData.capacity) : null,
    visibility: formData.visibility || "COLLEGE_ONLY"
  };

  // Only include team size fields if registration type is TEAM or BOTH
  if (!isIndividual) {
    if (formData.minTeamSize) {
      payload.minTeamSize = parseInt(formData.minTeamSize, 10);
    }
    if (formData.maxTeamSize) {
      payload.maxTeamSize = parseInt(formData.maxTeamSize, 10);
    }
  }

  return payload;
};

/**
 * Normalizes an ActivityResponse from backend
 */
export const normalizeActivity = (activity) => {
  if (!activity) return null;
  return {
    ...activity,
    id: activity.id || activity._id,
    eventId: activity.eventId,
    name: activity.name,
    description: activity.description,
    type: activity.type,
    rules: activity.rules,
    location: activity.location,
    startDateTime: activity.startDateTime,
    endDateTime: activity.endDateTime,
    registrationDeadline: activity.registrationDeadline,
    registrationType: activity.registrationType,
    capacity: activity.capacity,
    minTeamSize: activity.minTeamSize,
    maxTeamSize: activity.maxTeamSize
  };
};

/**
 * Creates a new activity under an event
 */
export const createActivity = async (eventId, formData) => {
  const payload = formatActivityPayload(formData);
  const response = await api.post(`/api/organizer/events/${eventId}/activities`, payload);
  return normalizeActivity(response.data);
};

export const createStandaloneActivity = async (formData) => {
  const response = await api.post("/api/organizer/activities", formatActivityPayload(formData));
  return normalizeActivity(response.data);
};

export const getStandaloneActivities = async () => {
  const response = await api.get("/api/organizer/activities");
  return Array.isArray(response.data) ? response.data.map(normalizeActivity) : [];
};

export const publishStandaloneActivity = async (activityId) => {
  const response = await api.patch(`/api/organizer/activities/${activityId}/publish`);
  return normalizeActivity(response.data);
};

export const deleteStandaloneActivity = async (activityId) => {
  const response = await api.delete(`/api/organizer/activities/${activityId}`);
  return response.data;
};

export const updateActivity = async (eventId, activityId, formData) => {
  const response = await api.put(`/api/organizer/events/${eventId}/activities/${activityId}`, formatActivityPayload(formData));
  return normalizeActivity(response.data);
};

/**
 * Retrieves activities for a specific event
 * Note: If backend GET endpoint is not implemented, returns empty array safely
 */
export const getActivitiesByEvent = async (eventId) => {
  try {
    const response = await api.get(`/api/organizer/events/${eventId}/activities`);
    const data = response.data;
    if (Array.isArray(data)) {
      return data.map(normalizeActivity);
    }
    return [];
  } catch (err) {
    // Graceful fallback if GET endpoint is not implemented on backend
    if (err.response?.status === 404 || err.response?.status === 405) {
      return [];
    }
    throw err;
  }
};
