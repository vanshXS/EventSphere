import api from "../../lib/api";

/**
 * Fetch all teams the authenticated participant belongs to
 */
export const getMyTeams = async () => {
  try {
    const response = await api.get("/api/participant/teams");
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    if (err.response?.status === 405 || err.response?.status === 404) {
      return [];
    }
    throw err;
  }
};

/**
 * Fetch a single team by ID
 */
export const getTeamById = async (teamId) => {
  const response = await api.get(`/api/participant/teams/${teamId}`);
  return response.data;
};

/**
 * Create a new team
 */
export const createTeam = async (name) => {
  const response = await api.post("/api/participant/teams", { name: name?.trim() });
  return response.data;
};

/**
 * Add a member to a team (leader only)
 */
export const addTeamMember = async (teamId, memberId) => {
  const response = await api.post(`/api/participant/teams/${teamId}/members`, { memberId });
  return response.data;
};

/**
 * Change team leader (leader only)
 */
export const changeTeamLeader = async (teamId, leaderId) => {
  const response = await api.put(`/api/participant/teams/${teamId}/leader`, { leaderId });
  return response.data;
};

/**
 * Remove a member from a team (leader only)
 */
export const removeTeamMember = async (teamId, memberId) => {
  const response = await api.delete(`/api/participant/teams/${teamId}/members/${memberId}`);
  return response.data;
};
