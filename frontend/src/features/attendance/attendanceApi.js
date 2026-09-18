import api from "../../lib/api";

export const getEventStaff = async (eventId) => {
  const response = await api.get("/api/organizer/events/" + eventId + "/staff");
  return Array.isArray(response.data) ? response.data : [];
};

export const inviteEventStaff = async (eventId, payload) => {
  const response = await api.post(
    "/api/organizer/events/" + eventId + "/staff",
    payload
  );
  return response.data;
};

export const getActivityStaff = async (activityId) => {
  const response = await api.get(
    "/api/organizer/activities/" + activityId + "/staff"
  );
  return Array.isArray(response.data) ? response.data : [];
};

export const inviteActivityStaff = async (activityId, payload) => {
  const response = await api.post(
    "/api/organizer/activities/" + activityId + "/staff",
    payload
  );
  return response.data;
};

export const revokeStaff = async (assignmentId) => {
  await api.patch("/api/organizer/staff/" + assignmentId + "/revoke");
};

export const getEventAttendance = async (eventId) => {
  const response = await api.get(
    "/api/organizer/events/" + eventId + "/attendance"
  );
  return Array.isArray(response.data) ? response.data : [];
};

export const getActivityAttendance = async (activityId) => {
  const response = await api.get(
    "/api/organizer/activities/" + activityId + "/attendance"
  );
  return Array.isArray(response.data) ? response.data : [];
};

export const checkIn = async (qrPayload, checkInType) => {
  const response = await api.post("/api/volunteer/attendance/check-in", {
    qrPayload,
    checkInType
  });
  return response.data;
};

export const getMyVolunteerAssignments = async () => {
  const response = await api.get("/api/volunteer/assignments");
  return Array.isArray(response.data) ? response.data : [];
};

export const getStaffInvitation = async (token) => {
  const response = await api.get("/api/staff/invitations/" + token);
  return response.data;
};

export const acceptStaffInvitation = async (token, payload) => {
  const response = await api.post(
    "/api/staff/invitations/" + token + "/accept",
    payload
  );
  return response.data;
};

export const getEventTicket = async (registrationId) => {
  const response = await api.get(
    "/api/participant/tickets/event-registrations/" + registrationId
  );
  return response.data;
};

export const getActivityTicket = async (registrationId) => {
  const response = await api.get(
    "/api/participant/tickets/activity-registrations/" + registrationId
  );
  return response.data;
};
