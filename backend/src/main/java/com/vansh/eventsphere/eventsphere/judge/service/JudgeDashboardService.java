package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.model.Team;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.TeamRepository;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeAssignedRoundResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeEligibleRegistrationResponse;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeEvaluation;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeEvaluationRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.service.mapper.JudgeDashboardMapper;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class JudgeDashboardService {

    private static final List<RegistrationStatus> ELIGIBLE_STATUSES =
            List.of(
                    RegistrationStatus.APPROVED,
                    RegistrationStatus.REGISTERED
            );

    private final UserRepository userRepository;
    private final ActivityRepository activityRepository;
    private final ActivityRegistrationRepository activityRegistrationRepository;
    private final TeamRepository teamRepository;

    private final JudgingRoundRepository judgingRoundRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final JudgeEvaluationRepository judgeEvaluationRepository;

    private final JudgeDashboardMapper dashboardMapper;

    public List<JudgeAssignedRoundResponse> getMyAssignedRounds(
            String judgeId
    ) {
        User judge = getAndValidateJudge(judgeId);

        List<JudgeAssignment> assignments =
                judgeAssignmentRepository.findByJudgeIdAndStatus(
                        judge.getUserId(),
                        JudgeAssignmentStatus.ACTIVE
                );

        List<JudgeAssignedRoundResponse> responses = new ArrayList<>();

        for (JudgeAssignment assignment : assignments) {
            if (assignment.getStatus() != JudgeAssignmentStatus.ACTIVE) {
                continue;
            }

            JudgeRound round = getRound(assignment.getRoundId());

            Activity activity = activityRepository
                    .findById(round.getActivityId())
                    .orElse(null);

            responses.add(
                    dashboardMapper.toAssignedRoundResponse(
                            assignment,
                            round,
                            activity
                    )
            );
        }

        responses.sort(
                Comparator.comparing(
                                JudgeAssignedRoundResponse::getActivityName,
                                Comparator.nullsLast(
                                        String.CASE_INSENSITIVE_ORDER
                                )
                        )
                        .thenComparing(
                                JudgeAssignedRoundResponse::getSequence,
                                Comparator.nullsLast(
                                        Comparator.naturalOrder()
                                )
                        )
        );

        return responses;
    }

    public List<JudgeEligibleRegistrationResponse> getEligibleRegistrations(
            String roundId,
            String judgeId
    ) {
        User judge = getAndValidateJudge(judgeId);
        JudgeRound round = getRound(roundId);

        validateActiveAssignment(roundId, judge.getUserId());
        validateRoundAllowsEntryListing(round);

        List<ActivityRegistration> registrations =
                activityRegistrationRepository.findByActivityIdAndStatusIn(
                        round.getActivityId(),
                        ELIGIBLE_STATUSES
                );

        if (registrations.isEmpty()) {
            return List.of();
        }

        Map<String, User> usersById =
                loadUsersForRegistrations(registrations);

        Map<String, Team> teamsById =
                loadTeamsForRegistrations(registrations);

        Map<String, JudgeEvaluation> evaluationsByRegistration =
                loadMyEvaluations(roundId, judge.getUserId());

        return registrations.stream()
                .map(registration ->
                        dashboardMapper.toEligibleRegistrationResponse(
                                registration,
                                teamsById.get(registration.getTeamId()),
                                usersById,
                                evaluationsByRegistration.get(
                                        registration.getId()
                                )
                        )
                )
                .sorted(
                        Comparator.comparing(
                                JudgeEligibleRegistrationResponse::getEntryName,
                                Comparator.nullsLast(
                                        String.CASE_INSENSITIVE_ORDER
                                )
                        )
                )
                .toList();
    }

    private User getAndValidateJudge(String judgeId) {
        if (judgeId == null || judgeId.isBlank()) {
            throw new AccessDeniedException(
                    "Authenticated judge identity is required."
            );
        }

        User judge = userRepository.findById(judgeId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Judge account not found."
                        )
                );

        if (judge.getRole() != Role.JUDGE || !judge.isActive()) {
            throw new AccessDeniedException(
                    "An active judge account is required."
            );
        }

        return judge;
    }

    private JudgeRound getRound(String roundId) {
        return judgingRoundRepository.findById(roundId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Judging round not found."
                        )
                );
    }

    private void validateActiveAssignment(
            String roundId,
            String judgeId
    ) {
        JudgeAssignment assignment = judgeAssignmentRepository
                .findByRoundIdAndJudgeId(roundId, judgeId)
                .orElseThrow(() ->
                        new AccessDeniedException(
                                "You are not assigned to this judging round."
                        )
                );

        if (assignment.getStatus() != JudgeAssignmentStatus.ACTIVE) {
            throw new AccessDeniedException(
                    "Your assignment to this round is not active."
            );
        }
    }

    private void validateRoundAllowsEntryListing(JudgeRound round) {
        JudgingRoundStatus status = round.getStatus();

        if (status == JudgingRoundStatus.DRAFT) {
            throw new BadRequestException(
                    "Registrations become available to judges "
                            + "after the organizer opens the round."
            );
        }
    }

    private Map<String, User> loadUsersForRegistrations(
            List<ActivityRegistration> registrations
    ) {
        Set<String> userIds = new HashSet<>();

        for (ActivityRegistration registration : registrations) {
            addIfPresent(userIds, registration.getParticipantId());
            addIfPresent(userIds, registration.getTeamLeaderId());

            if (registration.getTeamMemberIds() != null) {
                registration.getTeamMemberIds()
                        .forEach(id -> addIfPresent(userIds, id));
            }
        }

        Map<String, User> result = new HashMap<>();

        if (userIds.isEmpty()) {
            return result;
        }

        for (User user : userRepository.findAllById(userIds)) {
            result.put(user.getUserId(), user);
        }

        return result;
    }

    private Map<String, Team> loadTeamsForRegistrations(
            List<ActivityRegistration> registrations
    ) {
        Set<String> teamIds = new HashSet<>();

        for (ActivityRegistration registration : registrations) {
            addIfPresent(teamIds, registration.getTeamId());
        }

        Map<String, Team> result = new HashMap<>();

        if (teamIds.isEmpty()) {
            return result;
        }

        for (Team team : teamRepository.findAllById(teamIds)) {
            result.put(team.getId(), team);
        }

        return result;
    }

    private Map<String, JudgeEvaluation> loadMyEvaluations(
            String roundId,
            String judgeId
    ) {
        Map<String, JudgeEvaluation> result = new HashMap<>();

        for (JudgeEvaluation evaluation :
                judgeEvaluationRepository.findByRoundIdAndJudgeId(
                        roundId,
                        judgeId
                )) {
            result.put(
                    evaluation.getRegistrationId(),
                    evaluation
            );
        }

        return result;
    }

    private void addIfPresent(Set<String> values, String value) {
        if (value != null && !value.isBlank()) {
            values.add(value);
        }
    }
}