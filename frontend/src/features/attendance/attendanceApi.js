import api from "../../lib/api";

export const normalizeInvitationLink = (link) => {
  if (!link) return link;
  if (typeof window !== "undefined" && window.location?.origin) {
    return link
      .replace(/^https?:\/\/localhost:3000/i, window.location.origin)
      .replace(/^https?:\/\/127\.0\.0\.1:3000/i, window.location.origin);
  }
  return link
    .replace(/^https?:\/\/localhost:3000/i, "http://localhost:5173")
    .replace(/^https?:\/\/127\.0\.0\.1:3000/i, "http://localhost:5173");
};

const normalizeStaffItem = (item) => {
  if (!item) return item;
  if (item.invitationLink) {
    return {
      ...item,
      invitationLink: normalizeInvitationLink(item.invitationLink)
    };
  }
  return item;
};

export const getEventStaff = async (eventId) => {
  const response = await api.get("/api/organizer/events/" + eventId + "/staff");
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map(normalizeStaffItem);
};

export const inviteEventStaff = async (eventId, payload) => {
  const response = await api.post(
    "/api/organizer/events/" + eventId + "/staff",
    payload
  );
  return normalizeStaffItem(response.data);
};

export const getActivityStaff = async (activityId) => {
  const response = await api.get(
    "/api/organizer/activities/" + activityId + "/staff"
  );
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map(normalizeStaffItem);
};

export const inviteActivityStaff = async (activityId, payload) => {
  const response = await api.post(
    "/api/organizer/activities/" + activityId + "/staff",
    payload
  );
  return normalizeStaffItem(response.data);
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
  const data = Array.isArray(response.data) ? response.data : [];
  return data.map(normalizeStaffItem);
};

export const getStaffInvitation = async (token) => {
  const response = await api.get("/api/staff/invitations/" + token);
  return normalizeStaffItem(response.data);
};

export const acceptStaffInvitation = async (token, payload) => {
  const response = await api.post(
    "/api/staff/invitations/" + token + "/accept",
    payload
  );
  return normalizeStaffItem(response.data);
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
