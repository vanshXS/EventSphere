import api from "../../lib/api";

/**
 * Participant: Fetch visible events according to visibility rules
 */
export const getVisibleEvents = async () => {
  const response = await api.get("/api/participant/events");
  return Array.isArray(response.data) ? response.data : [];
};

export const getVisibleStandaloneActivities = async () => {
  const response = await api.get("/api/participant/events/activities");
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Participant: Fetch a specific visible event
 */
export const getVisibleEvent = async (eventId) => {
  const response = await api.get(`/api/participant/events/${eventId}`);
  return response.data;
};

/**
 * Participant: Fetch activities of a visible event
 */
export const getActivitiesOfVisibleEvent = async (eventId) => {
  const response = await api.get(`/api/participant/events/${eventId}/activities`);
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Participant: Register for an activity (INDIVIDUAL or TEAM)
 */
export const registerForActivity = async (activityId, { registrationType, teamId }) => {
  const payload = {
    registrationType,
    teamId: teamId || null,
  };
  const response = await api.post(`/api/participant/activities/${activityId}/registrations`, payload);
  return response.data;
};

/**
 * Participant: Fetch my registrations
 */
export const getMyRegistrations = async () => {
  try {
    const response = await api.get("/api/participant/registrations/me");
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    if (err.response?.status === 405 || err.response?.status === 404) {
      return [];
    }
    throw err;
  }
};

/**
 * Participant: Cancel an active registration
 */
export const cancelRegistration = async (registrationId) => {
  const response = await api.delete(`/api/participant/registrations/${registrationId}`);
  return response.data;
};

/**
 * Organizer: Fetch all registrations for an activity
 */
export const getOrganizerActivityRegistrations = async (activityId, eventId = null) => {
  const endpoint = eventId
    ? `/api/organizer/events/${eventId}/activities/${activityId}/registrations`
    : `/api/organizer/activities/${activityId}/registrations`;
  const response = await api.get(endpoint);
  return Array.isArray(response.data) ? response.data : [];
};
