package com.vansh.eventsphere.eventsphere.judge.service.mapper;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.Team;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeAssignedRoundResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeEligibleRegistrationResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeParticipantResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeCriterionResponse;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeEvaluation;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeCriterion;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.user.model.User;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class JudgeDashboardMapper {

    public JudgeAssignedRoundResponse toAssignedRoundResponse(
            JudgeAssignment assignment,
            JudgeRound round,
            Activity activity
    ) {
        List<JudgeCriterionResponse> criteria =
                round.getCriteria() == null
                        ? List.of()
                        : round.getCriteria()
                        .stream()
                        .map(this::toCriterionResponse)
                        .toList();

        return JudgeAssignedRoundResponse.builder()
                .assignmentId(assignment.getId())
                .roundId(round.getId())
                .activityId(round.getActivityId())
                .activityName(
                        activity == null ? "Unavailable activity"
                                : activity.getName()
                )
                .eventId(activity == null ? null : activity.getEventId())
                .roundName(round.getName())
                .description(round.getDescription())
                .sequence(round.getSequence())
                .scheduledStartDateTime(round.getScheduledStartDateTime())
                .scheduledEndDateTime(round.getScheduledEndDateTime())
                .scheduledTimeZoneId(round.getScheduledTimeZoneId())
                .activityActualStartDateTime(
                        activity == null ? null : activity.getActualStartDateTime())
                .status(round.getStatus())
                .canEvaluate(
                        round.getStatus()
                                == JudgingRoundStatus.OPEN
                )
                .criteria(criteria)
                .assignedAt(assignment.getAssignedAt())
                .openedAt(round.getOpenedAt())
                .closedAt(round.getClosedAt())
                .publishedAt(round.getPublishedAt())
                .build();
    }

    public JudgeEligibleRegistrationResponse toEligibleRegistrationResponse(
            ActivityRegistration registration,
            Team team,
            Map<String, User> usersById,
            JudgeEvaluation evaluation
    ) {
        boolean isTeamEntry = registration.getTeamId() != null;

        String participantId = isTeamEntry
                ? firstNonBlank(
                registration.getTeamLeaderId(),
                registration.getParticipantId()
        )
                : registration.getParticipantId();

        User primaryParticipant = usersById.get(participantId);

        String participantName = resolveParticipantName(
                primaryParticipant
        );

        String entryName;

        if (isTeamEntry) {
            entryName = team != null
                    && team.getName() != null
                    && !team.getName().isBlank()
                    ? team.getName()
                    : "Team entry";
        } else {
            entryName = participantName;
        }

        List<String> snapshotIds = registration.getTeamMemberIds();

        boolean snapshotAvailable = !isTeamEntry
                || (snapshotIds != null && !snapshotIds.isEmpty());

        List<String> rosterIds;

        if (!isTeamEntry) {
            rosterIds = participantId == null
                    ? List.of()
                    : List.of(participantId);
        } else if (snapshotAvailable) {
            rosterIds = snapshotIds.stream()
                    .filter(id -> id != null && !id.isBlank())
                    .distinct()
                    .toList();
        } else {
            /*
             * Do not reconstruct an old registration's roster
             * from the team's current, potentially changed membership.
             */
            rosterIds = List.of();
        }

        List<JudgeParticipantResponse> roster = rosterIds.stream()
                .map(id -> {
                    User user = usersById.get(id);

                    return JudgeParticipantResponse.builder()
                            .participantId(id)
                            .participantName(
                                    resolveParticipantName(user)
                            )
                            .teamLeader(
                                    id.equals(registration.getTeamLeaderId())
                            )
                            .build();
                })
                .toList();

        return JudgeEligibleRegistrationResponse.builder()
                .registrationId(registration.getId())
                .activityId(registration.getActivityId())
                .registrationType(registration.getRegistrationType())
                .registrationStatus(registration.getStatus())
                .entryName(entryName)
                .participantId(participantId)
                .participantName(participantName)
                .teamId(registration.getTeamId())
                .teamLeaderId(registration.getTeamLeaderId())
                .roster(roster)
                .rosterSnapshotAvailable(snapshotAvailable)
                .rosterNote(
                        isTeamEntry && !snapshotAvailable
                                ? "This registration has no saved roster snapshot. "
                                + "The current team roster was not substituted."
                                : null
                )
                .registeredAt(registration.getRegisteredAt())
                .evaluationStatus(
                        evaluation == null ? null : evaluation.getStatus()
                )
                .myTotalScore(
                        evaluation == null ? null : evaluation.getTotalScore()
                )
                .build();
    }

    private JudgeCriterionResponse toCriterionResponse(
            JudgeCriterion criterion
    ) {
        return JudgeCriterionResponse.builder()
                .id(criterion.getId())
                .name(criterion.getName())
                .description(criterion.getDescription())
                .maxScore(criterion.getMaxScore())
                .weight(criterion.getWeight())
                .build();
    }

    private String resolveParticipantName(User user) {
        if (user == null
                || user.getName() == null
                || user.getName().isBlank()) {
            return "Participant";
        }

        return user.getName();
    }

    private String firstNonBlank(String first, String fallback) {
        return first != null && !first.isBlank() ? first : fallback;
    }
}