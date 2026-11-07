package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import com.vansh.eventsphere.eventsphere.event.model.Team;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.TeamRepository;
import com.vansh.eventsphere.eventsphere.event.service.validators.ActivityOwnershipValidator;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgingResultEntryResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeResultsResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.ParticipantLeaderboardResponse;
import com.vansh.eventsphere.eventsphere.judge.model.*;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeEvaluationStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeEvaluationRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingResultRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.CompetitionRepository;
import com.vansh.eventsphere.eventsphere.judge.model.enums.RankingPolicy;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JudgingResultService {

    private static final List<RegistrationStatus> ELIGIBLE_STATUSES =
            List.of(
                    RegistrationStatus.APPROVED,
                    RegistrationStatus.REGISTERED
            );

    private final JudgingRoundRepository roundRepository;
    private final CompetitionRepository competitionRepository;
    private final JudgeAssignmentRepository assignmentRepository;
    private final JudgeEvaluationRepository evaluationRepository;
    private final JudgingResultRepository resultRepository;

    private final ActivityRegistrationRepository registrationRepository;
    private final ActivityRepository activityRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    private final ActivityOwnershipValidator activityOwnershipValidator;
    private final TransactionRunner transactionRunner;

    public JudgeResultsResponse publishResults(
            String roundId,
            String organizerEmail
    ) {
        return transactionRunner.run(() -> {
            transactionRunner.guard(JudgeRound.class, roundId);

            JudgeRound round = getRound(roundId);

            Activity activity =
                    activityOwnershipValidator.getAndValidateOwnedActivity(
                            round.getActivityId(),
                            organizerEmail
                    );

            // Repeated publish requests are safe to retry.
            if (round.getStatus() == JudgingRoundStatus.PUBLISHED) {
                JudgingResult existing = getResult(roundId);
                return toResponse(round, existing);
            }

            if (round.getStatus() != JudgingRoundStatus.CLOSED) {
                throw new BadRequestException(
                        "Only a closed judging round can be published."
                );
            }

            if (resultRepository.existsByRoundId(roundId)) {
                throw new BadRequestException(
                        "A result snapshot already exists for this round."
                );
            }

            List<JudgeAssignment> activeAssignments =
                    assignmentRepository.findByRoundIdAndStatus(
                            roundId,
                            JudgeAssignmentStatus.ACTIVE
                    );

            if (activeAssignments.isEmpty()) {
                throw new BadRequestException(
                        "At least one active judge is required to publish results."
                );
            }

            Set<String> activeJudgeIds = new HashSet<>();

            for (JudgeAssignment assignment : activeAssignments) {
                activeJudgeIds.add(assignment.getJudgeId());
            }

            List<ActivityRegistration> registrations =
                    registrationRepository.findByActivityIdAndStatusIn(
                            round.getActivityId(),
                            ELIGIBLE_STATUSES
                    );

            if (registrations.isEmpty()) {
                throw new BadRequestException(
                        "There are no eligible registrations to publish."
                );
            }

            Set<String> eligibleRegistrationIds = new HashSet<>();

            for (ActivityRegistration registration : registrations) {
                eligibleRegistrationIds.add(registration.getId());
            }

            List<JudgeEvaluation> submittedEvaluations =
                    evaluationRepository.findByRoundIdAndStatus(
                            roundId,
                            JudgeEvaluationStatus.SUBMITTED
                    );

            Map<String, List<JudgeEvaluation>> evaluationsByRegistration =
                    new HashMap<>();

            Set<String> completedPairs = new HashSet<>();

            for (JudgeEvaluation evaluation : submittedEvaluations) {
                if (!activeJudgeIds.contains(evaluation.getJudgeId())
                        || !eligibleRegistrationIds.contains(
                        evaluation.getRegistrationId()
                )) {
                    continue;
                }

                if (evaluation.getTotalScore() == null) {
                    throw new BadRequestException(
                            "A submitted evaluation has no calculated total score."
                    );
                }

                String pairKey = pairKey(
                        evaluation.getJudgeId(),
                        evaluation.getRegistrationId()
                );

                completedPairs.add(pairKey);

                evaluationsByRegistration
                        .computeIfAbsent(
                                evaluation.getRegistrationId(),
                                ignored -> new ArrayList<>()
                        )
                        .add(evaluation);
            }

            int missingEvaluations = 0;

            for (String registrationId : eligibleRegistrationIds) {
                for (String judgeId : activeJudgeIds) {
                    if (!completedPairs.contains(
                            pairKey(judgeId, registrationId)
                    )) {
                        missingEvaluations++;
                    }
                }
            }

            if (missingEvaluations > 0) {
                throw new BadRequestException(
                        "Results cannot be published yet. "
                                + missingEvaluations
                                + " required judge evaluation(s) are missing."
                );
            }

            Map<String, Team> teamsById =
                    loadTeamsByRegistration(registrations);

            Map<String, User> usersById =
                    loadUsersByRegistration(registrations);

            RankingPolicy rankingPolicy = activity.getRegistrationType() == RegistrationType.BOTH
                    ? competitionRepository.findByActivityId(activity.getId())
                            .map(competition -> competition.getRankingPolicy())
                            .orElse(RankingPolicy.SEPARATE_BY_ENTRY_TYPE)
                    : RankingPolicy.COMBINED_ALL_ENTRIES;
            if (rankingPolicy == null) {
                rankingPolicy = RankingPolicy.SEPARATE_BY_ENTRY_TYPE;
            }

            List<JudgingResultEntry> entries = new ArrayList<>();

            for (ActivityRegistration registration : registrations) {
                List<JudgeEvaluation> evaluations =
                        evaluationsByRegistration.get(
                                registration.getId()
                        );

                if (evaluations == null || evaluations.isEmpty()) {
                    throw new BadRequestException(
                            "A registration has no valid submitted evaluations."
                    );
                }

                BigDecimal total = evaluations.stream()
                        .map(JudgeEvaluation::getTotalScore)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal average = total.divide(
                        BigDecimal.valueOf(evaluations.size()),
                        2,
                        RoundingMode.HALF_UP
                );

                entries.add(
                        JudgingResultEntry.builder()
                                .registrationId(registration.getId())
                                .entryName(
                                        resolveEntryName(
                                                registration,
                                                teamsById,
                                                usersById
                                        )
                                )
                                .entryType(resolveEntryType(registration))
                                .totalScore(average)
                                .judgeCount(evaluations.size())
                                .build()
                );
            }

            Comparator<JudgingResultEntry> scoreOrder =
                    Comparator.comparing(JudgingResultEntry::getTotalScore)
                            .reversed();
            if (rankingPolicy == RankingPolicy.SEPARATE_BY_ENTRY_TYPE) {
                Map<RegistrationType, List<JudgingResultEntry>> entriesByType =
                        new HashMap<>();
                for (JudgingResultEntry entry : entries) {
                    entriesByType.computeIfAbsent(entry.getEntryType(), ignored -> new ArrayList<>())
                            .add(entry);
                }
                for (List<JudgingResultEntry> typeEntries : entriesByType.values()) {
                    typeEntries.sort(scoreOrder);
                    assignCompetitionRanks(typeEntries);
                }
                entries.sort(scoreOrder);
            } else {
                entries.sort(scoreOrder);
                assignCompetitionRanks(entries);
            }

            LocalDateTime now = LocalDateTime.now();

            JudgingResult result = JudgingResult.builder()
                    .roundId(round.getId())
                    .activityId(round.getActivityId())
                    .rankingPolicy(rankingPolicy)
                    .entries(entries)
                    .publishedBy(organizerEmail)
                    .publishedAt(now)
                    .build();

            JudgingResult savedResult = resultRepository.save(result);

            round.setStatus(JudgingRoundStatus.PUBLISHED);
            round.setPublishedAt(now);
            round.setPublishedBy(organizerEmail);
            round.setUpdatedAt(now);

            JudgeRound savedRound = roundRepository.save(round);

            return toResponse(savedRound, savedResult);
        });
    }

    public JudgeResultsResponse getOrganizerResults(
            String roundId,
            String organizerEmail
    ) {
        JudgeRound round = getRound(roundId);

        activityOwnershipValidator.getAndValidateOwnedActivity(
                round.getActivityId(),
                organizerEmail
        );

        return getPublishedResponse(round);
    }

    public JudgeResultsResponse getParticipantResults(
            String roundId,
            String participantId
    ) {
        JudgeRound round = getRound(roundId);

        // Check publication before loading any result snapshot.
        if (round.getStatus() != JudgingRoundStatus.PUBLISHED) {
            throw new ResourceNotFoundException(
                    "Published results are not available."
            );
        }

        User participant = resolveParticipant(participantId);

        if (participant.getRole()
                != com.vansh.eventsphere.eventsphere.user.model.Role.PARTICIPANT
                || !participant.isActive()) {
            throw new AccessDeniedException(
                    "An active participant account is required."
            );
        }

        List<ActivityRegistration> registrations =
                registrationRepository.findByActivityIdAndStatusIn(
                        round.getActivityId(),
                        ELIGIBLE_STATUSES
                );

        boolean registeredForActivity = registrations.stream()
                .anyMatch(registration ->
                        participant.getUserId().equals(
                                registration.getParticipantId()
                        )
                                || (registration.getTeamMemberIds() != null
                                && registration.getTeamMemberIds().contains(
                                participant.getUserId()
                        ))
                );

        if (!registeredForActivity) {
            throw new AccessDeniedException(
                    "You are not registered for this competition."
            );
        }

        return getPublishedResponse(round);
    }

    public List<ParticipantLeaderboardResponse> getParticipantLeaderboardResults(
            String participantId
    ) {
        User participant = resolveParticipant(participantId);

        if (participant.getRole()
                != com.vansh.eventsphere.eventsphere.user.model.Role.PARTICIPANT
                || !participant.isActive()) {
            throw new AccessDeniedException(
                    "An active participant account is required."
            );
        }

        List<ActivityRegistration> registrations =
                registrationRepository.findByParticipantIdOrTeamMemberIdsContaining(
                        participant.getUserId(),
                        participant.getUserId()
                );

        List<ActivityRegistration> eligibleRegistrations = registrations.stream()
                .filter(registration -> registration.getStatus() != null
                        && ELIGIBLE_STATUSES.contains(registration.getStatus()))
                .toList();

        if (eligibleRegistrations.isEmpty()) {
            return List.of();
        }

        Set<String> participantRegistrationIds = eligibleRegistrations.stream()
                .map(ActivityRegistration::getId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toSet());

        Set<String> activityIds = eligibleRegistrations.stream()
                .map(ActivityRegistration::getActivityId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toSet());

        if (activityIds.isEmpty()) {
            return List.of();
        }

        List<JudgeRound> publishedRounds =
                roundRepository.findByActivityIdInAndStatus(
                        activityIds,
                        JudgingRoundStatus.PUBLISHED
                );

        if (publishedRounds.isEmpty()) {
            return List.of();
        }

        Set<String> roundIds = publishedRounds.stream()
                .map(JudgeRound::getId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toSet());

        List<JudgingResult> results = resultRepository.findByRoundIdIn(roundIds);
        Map<String, JudgingResult> resultsByRoundId = results.stream()
                .collect(Collectors.toMap(
                        JudgingResult::getRoundId,
                        Function.identity(),
                        (existing, replacement) -> existing
                ));

        Map<String, Activity> activitiesById = activityRepository.findAllById(activityIds)
                .stream()
                .collect(Collectors.toMap(
                        Activity::getId,
                        Function.identity(),
                        (existing, replacement) -> existing
                ));

        Comparator<JudgeRound> roundComparator = Comparator
                .comparing((JudgeRound r) -> {
                    Activity a = activitiesById.get(r.getActivityId());
                    return a != null && a.getName() != null ? a.getName().toLowerCase() : "";
                })
                .thenComparing((JudgeRound r) -> r.getSequence() != null ? r.getSequence() : 0)
                .thenComparing((JudgeRound r) -> r.getPublishedAt() != null ? r.getPublishedAt() : LocalDateTime.MIN);

        List<ParticipantLeaderboardResponse> responses = new ArrayList<>();

        for (JudgeRound round : publishedRounds.stream().sorted(roundComparator).toList()) {
            JudgingResult result = resultsByRoundId.get(round.getId());
            if (result == null) {
                continue;
            }

            Activity activity = activitiesById.get(round.getActivityId());
            String activityName = (activity != null && activity.getName() != null && !activity.getName().isBlank())
                    ? activity.getName()
                    : "Activity";

            List<JudgingResultEntryResponse> entries = result.getEntries() == null
                    ? List.of()
                    : result.getEntries().stream()
                    .map(entry -> JudgingResultEntryResponse.builder()
                            .registrationId(entry.getRegistrationId())
                            .entryName(entry.getEntryName())
                            .entryType(entry.getEntryType())
                            .totalScore(entry.getTotalScore())
                            .judgeCount(entry.getJudgeCount())
                            .rank(entry.getRank())
                            .isMyEntry(participantRegistrationIds.contains(entry.getRegistrationId()) ? Boolean.TRUE : Boolean.FALSE)
                            .build())
                    .toList();

            responses.add(ParticipantLeaderboardResponse.builder()
                    .activityId(round.getActivityId())
                    .activityName(activityName)
                    .roundId(round.getId())
                    .roundName(round.getName())
                    .sequence(round.getSequence())
                    .status(round.getStatus())
                    .rankingPolicy(result.getRankingPolicy())
                    .publishedAt(result.getPublishedAt() != null ? result.getPublishedAt() : round.getPublishedAt())
                    .entries(entries)
                    .build());
        }

        return responses;
    }

    private JudgeResultsResponse getPublishedResponse(
            JudgeRound round
    ) {
        if (round.getStatus() != JudgingRoundStatus.PUBLISHED) {
            throw new ResourceNotFoundException(
                    "Published results are not available."
            );
        }

        return toResponse(round, getResult(round.getId()));
    }

    private User resolveParticipant(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResourceNotFoundException("Participant account not found.");
        }
        return userRepository.findById(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Participant account not found."
                        )
                );
    }

    private JudgeRound getRound(String roundId) {
        return roundRepository.findById(roundId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Judging round not found."
                        )
                );
    }

    private JudgingResult getResult(String roundId) {
        return resultRepository.findByRoundId(roundId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Published result snapshot was not found."
                        )
                );
    }

    private Map<String, Team> loadTeamsByRegistration(
            List<ActivityRegistration> registrations
    ) {
        Set<String> teamIds = new HashSet<>();

        for (ActivityRegistration registration : registrations) {
            if (registration.getTeamId() != null
                    && !registration.getTeamId().isBlank()) {
                teamIds.add(registration.getTeamId());
            }
        }

        Map<String, Team> result = new HashMap<>();

        if (!teamIds.isEmpty()) {
            for (Team team : teamRepository.findAllById(teamIds)) {
                result.put(team.getId(), team);
            }
        }

        return result;
    }

    private Map<String, User> loadUsersByRegistration(
            List<ActivityRegistration> registrations
    ) {
        Set<String> userIds = new HashSet<>();

        for (ActivityRegistration registration : registrations) {
            if (registration.getParticipantId() != null) {
                userIds.add(registration.getParticipantId());
            }

            if (registration.getTeamLeaderId() != null) {
                userIds.add(registration.getTeamLeaderId());
            }
        }

        Map<String, User> result = new HashMap<>();

        if (!userIds.isEmpty()) {
            for (User user : userRepository.findAllById(userIds)) {
                result.put(user.getUserId(), user);
            }
        }

        return result;
    }

    private String resolveEntryName(
            ActivityRegistration registration,
            Map<String, Team> teamsById,
            Map<String, User> usersById
    ) {
        if (registration.getTeamId() != null) {
            Team team = teamsById.get(registration.getTeamId());

            if (team != null
                    && team.getName() != null
                    && !team.getName().isBlank()) {
                return team.getName();
            }
            return "Team entry";
        }

        User participant = usersById.get(
                registration.getParticipantId()
        );

        if (participant != null
                && participant.getName() != null
                && !participant.getName().isBlank()) {
            return participant.getName();
        }

        return "Participant entry";
    }

    private RegistrationType resolveEntryType(ActivityRegistration registration) {
        if (registration.getRegistrationType() == RegistrationType.INDIVIDUAL
                || registration.getRegistrationType() == RegistrationType.TEAM) {
            return registration.getRegistrationType();
        }
        if (registration.getTeamId() != null && !registration.getTeamId().isBlank()) {
            return RegistrationType.TEAM;
        }
        if (registration.getParticipantId() != null
                && !registration.getParticipantId().isBlank()) {
            return RegistrationType.INDIVIDUAL;
        }
        throw new BadRequestException(
                "A registration entry type could not be determined from its saved registration.");
    }

    private void assignCompetitionRanks(
            List<JudgingResultEntry> entries
    ) {
        BigDecimal previousScore = null;
        int currentRank = 0;

        for (int i = 0; i < entries.size(); i++) {
            JudgingResultEntry entry = entries.get(i);

            if (previousScore == null
                    || entry.getTotalScore().compareTo(
                    previousScore
            ) != 0) {
                currentRank = i + 1;
            }

            entry.setRank(currentRank);
            previousScore = entry.getTotalScore();
        }
    }

    private String pairKey(String judgeId, String registrationId) {
        return judgeId + "::" + registrationId;
    }

    private JudgeResultsResponse toResponse(
            JudgeRound round,
            JudgingResult result
    ) {
        List<JudgingResultEntryResponse> entries =
                result.getEntries() == null
                        ? List.of()
                        : result.getEntries()
                        .stream()
                        .map(entry ->
                                JudgingResultEntryResponse.builder()
                                        .registrationId(
                                                entry.getRegistrationId()
                                        )
                                        .entryName(entry.getEntryName())
                                        .entryType(entry.getEntryType())
                                        .totalScore(entry.getTotalScore())
                                        .judgeCount(entry.getJudgeCount())
                                        .rank(entry.getRank())
                                        .build()
                        )
                        .toList();

        return JudgeResultsResponse.builder()
                .roundId(round.getId())
                .activityId(round.getActivityId())
                .roundName(round.getName())
                .sequence(round.getSequence())
                .status(round.getStatus())
                .rankingPolicy(result.getRankingPolicy())
                .publishedAt(result.getPublishedAt())
                .entries(entries)
                .build();
    }
}