import api from "../../lib/api";

export const getVisibleEvents = async () => {
  const response = await api.get("/api/participant/events");

  return Array.isArray(response.data) ? response.data : [];
};

export const getVisibleStandaloneActivities = async () => {
  const response = await api.get("/api/participant/events/activities");

  return Array.isArray(response.data) ? response.data : [];
};

export const getVisibleEvent = async (eventId) => {
  const response = await api.get(`/api/participant/events/${eventId}`);

  return response.data;
};

export const getActivitiesOfVisibleEvent = async (eventId) => {
  const response = await api.get(
    `/api/participant/events/${eventId}/activities`
  );

  return Array.isArray(response.data) ? response.data : [];
};

export const registerForActivity = async (
  activityId,
  { registrationType, teamId }
) => {
  const payload = {
    registrationType,
    teamId: teamId || null
  };

  const response = await api.post(
    `/api/participant/activities/${activityId}/registrations`,
    payload
  );

  return response.data;
};

export const getMyRegistrations = async () => {
  try {
    const response = await api.get("/api/participant/registrations/me");

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    if (
      error.response?.status === 405 ||
      error.response?.status === 404
    ) {
      return [];
    }

    throw error;
  }
};

export const cancelRegistration = async (registrationId) => {
  const response = await api.delete(
    `/api/participant/registrations/${registrationId}`
  );

  return response.data;
};

export const getOrganizerActivityRegistrations = async (
  activityId,
  eventId = null
) => {
  const endpoint = eventId
    ? `/api/organizer/events/${eventId}/activities/${activityId}/registrations`
    : `/api/organizer/activities/${activityId}/registrations`;

  const response = await api.get(endpoint);

  return Array.isArray(response.data) ? response.data : [];
};

export const approveRegistration = async (registrationId) => {
  const response = await api.patch(
    `/api/organizer/registrations/${registrationId}/approve`
  );

  return response.data;
};

export const rejectRegistration = async (
  registrationId,
  reason = ""
) => {
  const response = await api.patch(
    `/api/organizer/registrations/${registrationId}/reject`,
    {
      reason: reason.trim() || null
    }
  );

  return response.data;
};