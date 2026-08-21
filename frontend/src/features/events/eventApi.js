import api from "../../lib/api";
import { toIsoDateTime } from "./utils/eventHelpers";

/**
 * Prepares form data to match the backend CreateEventRequest model
 */
export const formatEventPayload = (formData) => {
  return {
    title: formData.title?.trim(),
    description: formData.description?.trim(),
    venue: formData.venue?.trim(),
    startDateTime: toIsoDateTime(formData.startDateTime),
    endDateTime: toIsoDateTime(formData.endDateTime),
    visibility: formData.visibility || "OPEN_TO_ALL"
  };
};

/**
 * Normalizes backend EventResponse into a clean frontend object
 */
export const normalizeEvent = (event) => {
  if (!event) return null;
  return {
    ...event,
    id: event.id || event._id,
    title: event.title,
    description: event.description,
    venue: event.venue,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    visibility: event.eventVisibility || event.visibility || "OPEN_TO_ALL",
    status: event.status || event.eventStatus || "DRAFT"
  };
};

export const createEvent = async (data) => {
  const payload = formatEventPayload(data);
  const response = await api.post("/api/organizer/events", payload);
  return normalizeEvent(response.data);
};

export const getMyEvent = async () => {
  const response = await api.get("/api/organizer/events");
  const data = response.data;
  if (Array.isArray(data)) {
    return data.map(normalizeEvent);
  }
  return [];
};

export const getEventById = async (eventId) => {
  const response = await api.get(`/api/organizer/events/${eventId}`);
  return normalizeEvent(response.data);
};

export const updateEvent = async (eventId, data) => {
  const payload = formatEventPayload(data);
  const response = await api.put(`/api/organizer/events/${eventId}`, payload);
  return normalizeEvent(response.data);
};

export const deleteEvent = async (eventId) => {
  const response = await api.delete(`/api/organizer/events/${eventId}`);
  return response.data;
};

export const publishEvent = async (eventId) => {
  const response = await api.patch(`/api/organizer/events/${eventId}/publish`);
  return normalizeEvent(response.data);
};