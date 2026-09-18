import api from "../../lib/api";
import { toIsoDateTime } from "../events/utils/eventHelpers";

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
    requiresApproval: formData.requiresApproval === true,
    capacity:
      formData.registrationLimit === "LIMITED"
        ? Number(formData.capacity)
        : null,
    visibility: formData.visibility || "COLLEGE_ONLY"
  };

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

export const createActivity = async (eventId, formData) => {
  const response = await api.post(
    `/api/organizer/events/${eventId}/activities`,
    formatActivityPayload(formData)
  );

  return normalizeActivity(response.data);
};

export const createStandaloneActivity = async (formData) => {
  const response = await api.post(
    "/api/organizer/activities",
    formatActivityPayload(formData)
  );

  return normalizeActivity(response.data);
};

export const getStandaloneActivities = async () => {
  const response = await api.get("/api/organizer/activities");

  return Array.isArray(response.data)
    ? response.data.map(normalizeActivity)
    : [];
};

export const publishStandaloneActivity = async (activityId) => {
  const response = await api.patch(
    `/api/organizer/activities/${activityId}/publish`
  );

  return normalizeActivity(response.data);
};

export const deleteStandaloneActivity = async (activityId) => {
  const response = await api.delete(
    `/api/organizer/activities/${activityId}`
  );

  return response.data;
};

export const startStandaloneActivity = async (activityId) => {
  const response = await api.patch(
    `/api/organizer/activities/${activityId}/start`
  );

  return normalizeActivity(response.data);
};

export const completeStandaloneActivity = async (activityId) => {
  const response = await api.patch(
    `/api/organizer/activities/${activityId}/complete`
  );

  return normalizeActivity(response.data);
};

export const updateActivity = async (
  eventId,
  activityId,
  formData
) => {
  const response = await api.put(
    `/api/organizer/events/${eventId}/activities/${activityId}`,
    formatActivityPayload(formData)
  );

  return normalizeActivity(response.data);
};

export const getActivitiesByEvent = async (eventId) => {
  try {
    const response = await api.get(
      `/api/organizer/events/${eventId}/activities`
    );

    return Array.isArray(response.data)
      ? response.data.map(normalizeActivity)
      : [];
  } catch (error) {
    if (
      error.response?.status === 404 ||
      error.response?.status === 405
    ) {
      return [];
    }

    throw error;
  }
};