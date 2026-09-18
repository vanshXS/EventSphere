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

export const registerForEvent = async (eventId) => {
  const response = await api.post(
    "/api/participant/event-registrations/events/" + eventId
  );
  return response.data;
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
  const [activityResponse, eventResponse] = await Promise.all([
    api.get("/api/participant/registrations/me"),
    api.get("/api/participant/event-registrations/my")
  ]);

  const activityRegistrations = Array.isArray(activityResponse.data)
    ? activityResponse.data.map((registration) => ({
        ...registration,
        registrationKind: "ACTIVITY"
      }))
    : [];

  const eventRegistrations = Array.isArray(eventResponse.data)
    ? eventResponse.data.map((registration) => ({
        ...registration,
        registrationKind: "EVENT"
      }))
    : [];

  return [...activityRegistrations, ...eventRegistrations].sort(
    (a, b) =>
      new Date(b.registeredAt || 0).getTime() -
      new Date(a.registeredAt || 0).getTime()
  );
};

export const cancelRegistration = async (registrationOrId) => {
  const registration =
    typeof registrationOrId === "object"
      ? registrationOrId
      : { id: registrationOrId };

  if (registration.registrationKind === "EVENT") {
    await api.delete(
      `/api/participant/event-registrations/${registration.id}`
    );

    return {
      ...registration,
      status: "CANCELLED"
    };
  }

  const response = await api.delete(
    `/api/participant/registrations/${registration.id}`
  );

  return {
    ...response.data,
    registrationKind: "ACTIVITY"
  };
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