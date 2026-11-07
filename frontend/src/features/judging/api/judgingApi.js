import api from "../../../lib/api";

const paths = {
  competition: (activityId) => `/api/organizer/activities/${activityId}/competition`,
  roundsForActivity: (activityId) => `/api/organizer/activities/${activityId}/judging-rounds`,
  round: (roundId) => `/api/organizer/judging-rounds/${roundId}`,
  roundOpen: (roundId) => `/api/organizer/judging-rounds/${roundId}/open`,
  roundClose: (roundId) => `/api/organizer/judging-rounds/${roundId}/close`,
  roundClosurePreview: (roundId) => `/api/organizer/judging-rounds/${roundId}/closure-preview`,
  assignmentsForRound: (roundId) => `/api/organizer/judging-rounds/${roundId}/judges`,
  invitationsForRound: (roundId) => `/api/organizer/judging-rounds/${roundId}/judges/invitations`,
  inviteJudge: (roundId) => `/api/organizer/judging-rounds/${roundId}/judges/invite`,
  revokeInvitation: (roundId, invitationId) => `/api/organizer/judging-rounds/${roundId}/judges/invitations/${invitationId}`,
  revokeAssignment: (roundId, judgeId) => `/api/organizer/judging-rounds/${roundId}/judges/${judgeId}`,
  organizerResults: (roundId) => `/api/organizer/judging-rounds/${roundId}/results`,
  publishResults: (roundId) => `/api/organizer/judging-rounds/${roundId}/publish-results`,
  judgeRounds: "/api/judge/rounds",
  judgeInvitation: (token) => `/api/judge/invitations/${token}`,
  judgeRegistrations: (roundId) => `/api/judge/judging-rounds/${roundId}/registrations`,
  evaluation: (roundId, registrationId) =>
    `/api/judge/judging-rounds/${roundId}/registrations/${registrationId}/evaluation`,
  participantMyResults: "/api/participant/judging-results/me",
  participantRoundResults: (roundId) => `/api/participant/judging-rounds/${roundId}/results`,
};

const asArray = (value) => (Array.isArray(value) ? value : []);

export const getCompetition = async (activityId) => {
  const response = await api.get(paths.competition(activityId));
  return response.data;
};

export const createCompetition = async (activityId, payload) => {
  const response = await api.post(paths.competition(activityId), payload);
  return response.data;
};

export const updateCompetition = async (activityId, payload) => {
  const response = await api.put(paths.competition(activityId), payload);
  return response.data;
};

export const getJudgingRounds = async (activityId) => {
  const response = await api.get(paths.roundsForActivity(activityId));
  return asArray(response.data);
};

export const createJudgingRound = async (activityId, payload) => {
  const response = await api.post(paths.roundsForActivity(activityId), payload);
  return response.data;
};

export const updateJudgingRound = async (roundId, payload) => {
  const response = await api.put(paths.round(roundId), payload);
  return response.data;
};

export const openJudgingRound = async (roundId) => {
  const response = await api.post(paths.roundOpen(roundId));
  return response.data;
};

export const getRoundClosurePreview = async (roundId) => {
  const response = await api.get(paths.roundClosurePreview(roundId));
  return response.data;
};

export const closeJudgingRound = async (roundId) => {
  const response = await api.post(paths.roundClose(roundId));
  return response.data;
};

export const getRoundAssignments = async (roundId) => {
  const response = await api.get(paths.assignmentsForRound(roundId));
  return asArray(response.data);
};

export const getRoundInvitations = async (roundId) => {
  const response = await api.get(paths.invitationsForRound(roundId));
  return asArray(response.data);
};

export const inviteJudgeByEmail = async (roundId, email) => {
  const response = await api.post(paths.inviteJudge(roundId), { email });
  return response.data;
};

export const revokeJudgeInvitation = async (roundId, invitationId) => {
  const response = await api.delete(paths.revokeInvitation(roundId, invitationId));
  return response.data;
};

export const assignJudge = async (roundId, email) => {
  const response = await api.post(paths.assignmentsForRound(roundId), { email });
  return response.data;
};

export const revokeJudgeAssignment = async (roundId, judgeId) => {
  const response = await api.delete(paths.revokeAssignment(roundId, judgeId));
  return response.data;
};

export const getOrganizerResults = async (roundId) => {
  const response = await api.get(paths.organizerResults(roundId));
  return response.data;
};

export const publishJudgingResults = async (roundId) => {
  const response = await api.post(paths.publishResults(roundId));
  return response.data;
};

export const getMyAssignedRounds = async () => {
  const response = await api.get(paths.judgeRounds);
  return asArray(response.data);
};

export const getJudgeInvitation = async (token) => {
  const response = await api.get(paths.judgeInvitation(token));
  return response.data;
};

export const acceptJudgeInvitation = async (token, payload) => {
  const response = await api.post(`${paths.judgeInvitation(token)}/accept`, payload);
  return response.data;
};

export const getEligibleRegistrations = async (roundId) => {
  const response = await api.get(paths.judgeRegistrations(roundId));
  return asArray(response.data);
};

export const getMyEvaluation = async (roundId, registrationId) => {
  const response = await api.get(paths.evaluation(roundId, registrationId));
  return response.data;
};

export const saveEvaluationDraft = async (roundId, registrationId, payload) => {
  const response = await api.put(
    `${paths.evaluation(roundId, registrationId)}/draft`,
    payload
  );
  return response.data;
};

export const submitEvaluation = async (roundId, registrationId, payload) => {
  const response = await api.post(
    `${paths.evaluation(roundId, registrationId)}/submit`,
    payload
  );
  return response.data;
};

export const getParticipantLeaderboardResults = async () => {
  const response = await api.get(paths.participantMyResults);
  return asArray(response.data);
};

export const getParticipantMyResults = getParticipantLeaderboardResults;

export const getParticipantRoundResults = async (roundId) => {
  const response = await api.get(paths.participantRoundResults(roundId));
  return response.data;
};

export const getApiErrorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  error?.response?.data?.message || error?.response?.data?.detail || error?.message || fallback;
