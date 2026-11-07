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
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeResultsResponse;
import com.vansh.eventsphere.eventsphere.judge.model.Competition;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeEvaluation;
import com.vansh.eventsphere.eventsphere.judge.model.JudgingResult;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeEvaluationStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.RankingPolicy;
import com.vansh.eventsphere.eventsphere.judge.repository.CompetitionRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeEvaluationRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingResultRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.judge.dto.ParticipantLeaderboardResponse;
import com.vansh.eventsphere.eventsphere.judge.model.JudgingResultEntry;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JudgingResultServiceTest {

    @Mock private JudgingRoundRepository rounds;
    @Mock private CompetitionRepository competitions;
    @Mock private JudgeAssignmentRepository assignments;
    @Mock private JudgeEvaluationRepository evaluations;
    @Mock private JudgingResultRepository results;
    @Mock private ActivityRegistrationRepository registrations;
    @Mock private ActivityRepository activities;
    @Mock private TeamRepository teams;
    @Mock private UserRepository users;
    @Mock private ActivityOwnershipValidator ownershipValidator;
    @Mock private TransactionRunner transactionRunner;

    @Test
    void separatesBothEntryTypesAndRanksTiesWithinEachLeaderboard() {
        JudgeResultsResponse response = publish(RankingPolicy.SEPARATE_BY_ENTRY_TYPE);

        assertEquals(RankingPolicy.SEPARATE_BY_ENTRY_TYPE, response.getRankingPolicy());
        assertEquals(RegistrationType.INDIVIDUAL, response.getEntries().get(0).getEntryType());
        assertEquals(1, response.getEntries().get(0).getRank());
        assertEquals(RegistrationType.INDIVIDUAL, response.getEntries().get(1).getEntryType());
        assertEquals(1, response.getEntries().get(1).getRank());
        assertEquals(RegistrationType.TEAM, response.getEntries().get(2).getEntryType());
        assertEquals(1, response.getEntries().get(2).getRank());
    }

    @Test
    void combinedRankingUsesActualRegistrationTypesAndCompetitionRanks() {
        JudgeResultsResponse response = publish(RankingPolicy.COMBINED_ALL_ENTRIES);

        assertEquals(RankingPolicy.COMBINED_ALL_ENTRIES, response.getRankingPolicy());
        assertEquals(1, response.getEntries().get(0).getRank());
        assertEquals(1, response.getEntries().get(1).getRank());
        assertEquals(RegistrationType.TEAM, response.getEntries().get(2).getEntryType());
        assertEquals(3, response.getEntries().get(2).getRank());
    }

    @Test
    void participantWithApprovedIndividualRegistrationCanRetrievePublishedResults() {
        JudgingResultService service = new JudgingResultService(
                rounds, competitions, assignments, evaluations, results,
                registrations, activities, teams, users, ownershipValidator, transactionRunner);

        User participant = User.builder()
                .userId("participant-1")
                .email("participant1@test.com")
                .role(Role.PARTICIPANT)
                .active(true)
                .build();
        when(users.findByEmail("participant1@test.com")).thenReturn(Optional.of(participant));

        ActivityRegistration reg = individual("reg-1", "participant-1");
        when(registrations.findByParticipantIdOrTeamMemberIdsContaining("participant-1", "participant-1"))
                .thenReturn(List.of(reg));

        JudgeRound round = JudgeRound.builder()
                .id("round-1")
                .activityId("activity-1")
                .name("Final Round")
                .sequence(1)
                .status(JudgingRoundStatus.PUBLISHED)
                .publishedAt(LocalDateTime.now())
                .build();
        when(rounds.findByActivityIdInAndStatus(Set.of("activity-1"), JudgingRoundStatus.PUBLISHED))
                .thenReturn(List.of(round));

        JudgingResult result = JudgingResult.builder()
                .roundId("round-1")
                .activityId("activity-1")
                .rankingPolicy(RankingPolicy.COMBINED_ALL_ENTRIES)
                .publishedAt(LocalDateTime.now())
                .entries(List.of(
                        JudgingResultEntry.builder()
                                .registrationId("reg-1")
                                .entryName("One")
                                .entryType(RegistrationType.INDIVIDUAL)
                                .totalScore(new BigDecimal("95.00"))
                                .judgeCount(2)
                                .rank(1)
                                .build(),
                        JudgingResultEntry.builder()
                                .registrationId("reg-2")
                                .entryName("Two")
                                .entryType(RegistrationType.INDIVIDUAL)
                                .totalScore(new BigDecimal("85.00"))
                                .judgeCount(2)
                                .rank(2)
                                .build()
                ))
                .build();
        when(results.findByRoundIdIn(Set.of("round-1"))).thenReturn(List.of(result));

        Activity activity = Activity.builder()
                .id("activity-1")
                .name("Hackathon 2026")
                .build();
        when(activities.findAllById(Set.of("activity-1"))).thenReturn(List.of(activity));

        List<ParticipantLeaderboardResponse> response = service.getParticipantLeaderboardResults("participant1@test.com");

        assertEquals(1, response.size());
        ParticipantLeaderboardResponse roundResp = response.get(0);
        assertEquals("activity-1", roundResp.getActivityId());
        assertEquals("Hackathon 2026", roundResp.getActivityName());
        assertEquals("round-1", roundResp.getRoundId());
        assertEquals("Final Round", roundResp.getRoundName());
        assertEquals(1, roundResp.getSequence());
        assertEquals(RankingPolicy.COMBINED_ALL_ENTRIES, roundResp.getRankingPolicy());
        assertEquals(2, roundResp.getEntries().size());

        assertTrue(roundResp.getEntries().get(0).getIsMyEntry());
        assertFalse(roundResp.getEntries().get(1).getIsMyEntry());
        assertEquals(1, roundResp.getEntries().get(0).getRank());
        assertEquals(new BigDecimal("95.00"), roundResp.getEntries().get(0).getTotalScore());
    }

    @Test
    void participantBelongingToRegisteredTeamCanRetrieveResults() {
        JudgingResultService service = new JudgingResultService(
                rounds, competitions, assignments, evaluations, results,
                registrations, activities, teams, users, ownershipValidator, transactionRunner);

        User member = User.builder()
                .userId("member-1")
                .email("member1@test.com")
                .role(Role.PARTICIPANT)
                .active(true)
                .build();
        when(users.findByEmail("member1@test.com")).thenReturn(Optional.of(member));

        ActivityRegistration teamReg = ActivityRegistration.builder()
                .id("team-reg-1")
                .activityId("activity-1")
                .teamId("team-1")
                .teamLeaderId("leader-1")
                .teamMemberIds(List.of("leader-1", "member-1", "member-2"))
                .registrationType(RegistrationType.TEAM)
                .status(RegistrationStatus.REGISTERED)
                .build();
        when(registrations.findByParticipantIdOrTeamMemberIdsContaining("member-1", "member-1"))
                .thenReturn(List.of(teamReg));

        JudgeRound round = JudgeRound.builder()
                .id("round-1")
                .activityId("activity-1")
                .name("Round 1")
                .sequence(1)
                .status(JudgingRoundStatus.PUBLISHED)
                .build();
        when(rounds.findByActivityIdInAndStatus(Set.of("activity-1"), JudgingRoundStatus.PUBLISHED))
                .thenReturn(List.of(round));

        JudgingResult result = JudgingResult.builder()
                .roundId("round-1")
                .activityId("activity-1")
                .rankingPolicy(RankingPolicy.SEPARATE_BY_ENTRY_TYPE)
                .entries(List.of(
                        JudgingResultEntry.builder()
                                .registrationId("team-reg-1")
                                .entryName("Code Warriors")
                                .entryType(RegistrationType.TEAM)
                                .totalScore(new BigDecimal("92.50"))
                                .judgeCount(1)
                                .rank(1)
                                .build()
                ))
                .build();
        when(results.findByRoundIdIn(Set.of("round-1"))).thenReturn(List.of(result));

        Activity activity = Activity.builder().id("activity-1").name("Coding Sprint").build();
        when(activities.findAllById(Set.of("activity-1"))).thenReturn(List.of(activity));

        List<ParticipantLeaderboardResponse> response = service.getParticipantLeaderboardResults("member1@test.com");

        assertEquals(1, response.size());
        assertEquals("Coding Sprint", response.get(0).getActivityName());
        assertEquals(1, response.get(0).getEntries().size());
        assertTrue(response.get(0).getEntries().get(0).getIsMyEntry());
    }

    @Test
    void participantCannotRetrieveResultsForActivityNotRegisteredFor() {
        JudgingResultService service = new JudgingResultService(
                rounds, competitions, assignments, evaluations, results,
                registrations, activities, teams, users, ownershipValidator, transactionRunner);

        User participant = User.builder()
                .userId("participant-1")
                .email("participant1@test.com")
                .role(Role.PARTICIPANT)
                .active(true)
                .build();
        when(users.findByEmail("participant1@test.com")).thenReturn(Optional.of(participant));

        ActivityRegistration reg = ActivityRegistration.builder()
                .id("reg-2")
                .activityId("activity-2")
                .participantId("participant-1")
                .registrationType(RegistrationType.INDIVIDUAL)
                .status(RegistrationStatus.APPROVED)
                .build();
        when(registrations.findByParticipantIdOrTeamMemberIdsContaining("participant-1", "participant-1"))
                .thenReturn(List.of(reg));

        when(rounds.findByActivityIdInAndStatus(Set.of("activity-2"), JudgingRoundStatus.PUBLISHED))
                .thenReturn(List.of());

        List<ParticipantLeaderboardResponse> response = service.getParticipantLeaderboardResults("participant1@test.com");

        assertTrue(response.isEmpty());
    }

    @Test
    void cancelledAndRejectedRegistrationsDoNotGrantAccess() {
        JudgingResultService service = new JudgingResultService(
                rounds, competitions, assignments, evaluations, results,
                registrations, activities, teams, users, ownershipValidator, transactionRunner);

        User participant = User.builder()
                .userId("participant-1")
                .email("participant1@test.com")
                .role(Role.PARTICIPANT)
                .active(true)
                .build();
        when(users.findByEmail("participant1@test.com")).thenReturn(Optional.of(participant));

        ActivityRegistration cancelled = ActivityRegistration.builder()
                .id("reg-1")
                .activityId("activity-1")
                .participantId("participant-1")
                .status(RegistrationStatus.CANCELLED)
                .build();
        ActivityRegistration rejected = ActivityRegistration.builder()
                .id("reg-2")
                .activityId("activity-1")
                .participantId("participant-1")
                .status(RegistrationStatus.REJECTED)
                .build();

        when(registrations.findByParticipantIdOrTeamMemberIdsContaining("participant-1", "participant-1"))
                .thenReturn(List.of(cancelled, rejected));

        List<ParticipantLeaderboardResponse> response = service.getParticipantLeaderboardResults("participant1@test.com");

        assertTrue(response.isEmpty());
    }

    @Test
    void unpublishedJudgingRoundsAreNeverReturned() {
        JudgingResultService service = new JudgingResultService(
                rounds, competitions, assignments, evaluations, results,
                registrations, activities, teams, users, ownershipValidator, transactionRunner);

        User participant = User.builder()
                .userId("participant-1")
                .email("participant1@test.com")
                .role(Role.PARTICIPANT)
                .active(true)
                .build();
        when(users.findByEmail("participant1@test.com")).thenReturn(Optional.of(participant));

        ActivityRegistration reg = individual("reg-1", "participant-1");
        when(registrations.findByParticipantIdOrTeamMemberIdsContaining("participant-1", "participant-1"))
                .thenReturn(List.of(reg));

        when(rounds.findByActivityIdInAndStatus(Set.of("activity-1"), JudgingRoundStatus.PUBLISHED))
                .thenReturn(List.of());

        List<ParticipantLeaderboardResponse> response = service.getParticipantLeaderboardResults("participant1@test.com");

        assertTrue(response.isEmpty());
    }

    @Test
    void multiplePublishedRoundsAreReturnedIndependently() {
        JudgingResultService service = new JudgingResultService(
                rounds, competitions, assignments, evaluations, results,
                registrations, activities, teams, users, ownershipValidator, transactionRunner);

        User participant = User.builder()
                .userId("participant-1")
                .email("participant1@test.com")
                .role(Role.PARTICIPANT)
                .active(true)
                .build();
        when(users.findByEmail("participant1@test.com")).thenReturn(Optional.of(participant));

        ActivityRegistration reg = individual("reg-1", "participant-1");
        when(registrations.findByParticipantIdOrTeamMemberIdsContaining("participant-1", "participant-1"))
                .thenReturn(List.of(reg));

        JudgeRound round1 = JudgeRound.builder()
                .id("round-1")
                .activityId("activity-1")
                .name("Prelims")
                .sequence(1)
                .status(JudgingRoundStatus.PUBLISHED)
                .publishedAt(LocalDateTime.of(2026, 11, 1, 10, 0))
                .build();
        JudgeRound round2 = JudgeRound.builder()
                .id("round-2")
                .activityId("activity-1")
                .name("Finals")
                .sequence(2)
                .status(JudgingRoundStatus.PUBLISHED)
                .publishedAt(LocalDateTime.of(2026, 11, 2, 10, 0))
                .build();

        when(rounds.findByActivityIdInAndStatus(Set.of("activity-1"), JudgingRoundStatus.PUBLISHED))
                .thenReturn(List.of(round1, round2));

        JudgingResult result1 = JudgingResult.builder()
                .roundId("round-1")
                .activityId("activity-1")
                .rankingPolicy(RankingPolicy.COMBINED_ALL_ENTRIES)
                .publishedAt(LocalDateTime.of(2026, 11, 1, 10, 0))
                .entries(List.of(
                        JudgingResultEntry.builder().registrationId("reg-1").rank(2).totalScore(new BigDecimal("80.00")).build()
                ))
                .build();
        JudgingResult result2 = JudgingResult.builder()
                .roundId("round-2")
                .activityId("activity-1")
                .rankingPolicy(RankingPolicy.COMBINED_ALL_ENTRIES)
                .publishedAt(LocalDateTime.of(2026, 11, 2, 10, 0))
                .entries(List.of(
                        JudgingResultEntry.builder().registrationId("reg-1").rank(1).totalScore(new BigDecimal("98.00")).build()
                ))
                .build();

        when(results.findByRoundIdIn(Set.of("round-1", "round-2"))).thenReturn(List.of(result1, result2));

        Activity activity = Activity.builder().id("activity-1").name("Hackathon").build();
        when(activities.findAllById(Set.of("activity-1"))).thenReturn(List.of(activity));

        List<ParticipantLeaderboardResponse> response = service.getParticipantLeaderboardResults("participant1@test.com");

        assertEquals(2, response.size());
        assertEquals("Prelims", response.get(0).getRoundName());
        assertEquals(1, response.get(0).getSequence());
        assertEquals(new BigDecimal("80.00"), response.get(0).getEntries().get(0).getTotalScore());

        assertEquals("Finals", response.get(1).getRoundName());
        assertEquals(2, response.get(1).getSequence());
        assertEquals(new BigDecimal("98.00"), response.get(1).getEntries().get(0).getTotalScore());
    }

    @Test
    void participantWithNoPublishedResultsReceivesEmptyList() {
        JudgingResultService service = new JudgingResultService(
                rounds, competitions, assignments, evaluations, results,
                registrations, activities, teams, users, ownershipValidator, transactionRunner);

        User participant = User.builder()
                .userId("participant-1")
                .email("participant1@test.com")
                .role(Role.PARTICIPANT)
                .active(true)
                .build();
        when(users.findByEmail("participant1@test.com")).thenReturn(Optional.of(participant));
        when(registrations.findByParticipantIdOrTeamMemberIdsContaining("participant-1", "participant-1"))
                .thenReturn(List.of());

        List<ParticipantLeaderboardResponse> response = service.getParticipantLeaderboardResults("participant1@test.com");

        assertNotNull(response);
        assertTrue(response.isEmpty());
    }

    @Test
    void existingParticipantRoundResultAuthorizationRemainsIntact() {
        JudgingResultService service = new JudgingResultService(
                rounds, competitions, assignments, evaluations, results,
                registrations, activities, teams, users, ownershipValidator, transactionRunner);

        JudgeRound unpublishedRound = JudgeRound.builder()
                .id("round-unpub")
                .activityId("activity-1")
                .status(JudgingRoundStatus.CLOSED)
                .build();
        when(rounds.findById("round-unpub")).thenReturn(Optional.of(unpublishedRound));

        assertThrows(ResourceNotFoundException.class,
                () -> service.getParticipantResults("round-unpub", "p1@test.com"));

        JudgeRound publishedRound = JudgeRound.builder()
                .id("round-pub")
                .activityId("activity-1")
                .name("Finals")
                .sequence(1)
                .status(JudgingRoundStatus.PUBLISHED)
                .build();
        when(rounds.findById("round-pub")).thenReturn(Optional.of(publishedRound));

        User user1 = User.builder()
                .userId("p-other")
                .email("other@test.com")
                .role(Role.PARTICIPANT)
                .active(true)
                .build();
        when(users.findByEmail("other@test.com")).thenReturn(Optional.of(user1));
        when(registrations.findByActivityIdAndStatusIn(eq("activity-1"), any()))
                .thenReturn(List.of(individual("reg-1", "different-user")));

        assertThrows(AccessDeniedException.class,
                () -> service.getParticipantResults("round-pub", "other@test.com"));

        User user2 = User.builder()
                .userId("p-registered")
                .email("reg@test.com")
                .role(Role.PARTICIPANT)
                .active(true)
                .build();
        when(users.findByEmail("reg@test.com")).thenReturn(Optional.of(user2));
        when(registrations.findByActivityIdAndStatusIn(eq("activity-1"), any()))
                .thenReturn(List.of(individual("reg-1", "p-registered")));

        JudgingResult pubResult = JudgingResult.builder()
                .roundId("round-pub")
                .rankingPolicy(RankingPolicy.COMBINED_ALL_ENTRIES)
                .entries(List.of())
                .build();
        when(results.findByRoundId("round-pub")).thenReturn(Optional.of(pubResult));

        JudgeResultsResponse resultsResponse = service.getParticipantResults("round-pub", "reg@test.com");
        assertNotNull(resultsResponse);
        assertEquals("round-pub", resultsResponse.getRoundId());
    }

    @Test
    void nonParticipantRoleOrInactiveAccountThrowsAccessDeniedException() {
        JudgingResultService service = new JudgingResultService(
                rounds, competitions, assignments, evaluations, results,
                registrations, activities, teams, users, ownershipValidator, transactionRunner);

        User organizer = User.builder()
                .userId("org-1")
                .email("org@test.com")
                .role(Role.ORGANIZER)
                .active(true)
                .build();
        when(users.findByEmail("org@test.com")).thenReturn(Optional.of(organizer));

        assertThrows(AccessDeniedException.class,
                () -> service.getParticipantLeaderboardResults("org@test.com"));

        User inactive = User.builder()
                .userId("part-inactive")
                .email("inactive@test.com")
                .role(Role.PARTICIPANT)
                .active(false)
                .build();
        when(users.findByEmail("inactive@test.com")).thenReturn(Optional.of(inactive));

        assertThrows(AccessDeniedException.class,
                () -> service.getParticipantLeaderboardResults("inactive@test.com"));
    }

    private JudgeResultsResponse publish(RankingPolicy policy) {
        JudgeRound round = JudgeRound.builder()
                .id("round-1")
                .activityId("activity-1")
                .name("Final")
                .sequence(1)
                .status(JudgingRoundStatus.CLOSED)
                .build();
        Activity activity = Activity.builder()
                .id("activity-1")
                .registrationType(RegistrationType.BOTH)
                .build();
        List<ActivityRegistration> entries = List.of(
                individual("individual-1", "participant-1"),
                individual("individual-2", "participant-2"),
                ActivityRegistration.builder()
                        .id("team-registration")
                        .activityId("activity-1")
                        .teamId("team-1")
                        .teamLeaderId("participant-3")
                        .teamMemberIds(List.of("participant-3", "participant-4"))
                        .registrationType(RegistrationType.TEAM)
                        .status(RegistrationStatus.APPROVED)
                        .build());
        List<JudgeEvaluation> submitted = List.of(
                evaluation("individual-1", "90"),
                evaluation("individual-2", "90"),
                evaluation("team-registration", "80"));

        when(transactionRunner.run(anySupplier()))
                .thenAnswer(invocation -> ((Supplier<?>) invocation.getArgument(0)).get());
        when(rounds.findById("round-1")).thenReturn(Optional.of(round));
        when(ownershipValidator.getAndValidateOwnedActivity("activity-1", "organizer-1"))
                .thenReturn(activity);
        when(results.existsByRoundId("round-1")).thenReturn(false);
        when(assignments.findByRoundIdAndStatus("round-1", JudgeAssignmentStatus.ACTIVE))
                .thenReturn(List.of(JudgeAssignment.builder().judgeId("judge-1").build()));
        when(registrations.findByActivityIdAndStatusIn(
                any(), any())).thenReturn(entries);
        when(evaluations.findByRoundIdAndStatus(
                "round-1", JudgeEvaluationStatus.SUBMITTED)).thenReturn(submitted);
        when(competitions.findByActivityId("activity-1"))
                .thenReturn(Optional.of(Competition.builder()
                        .rankingPolicy(policy)
                        .build()));
        when(teams.findAllById(anyIterable()))
                .thenReturn(List.of(Team.builder().id("team-1").name("Team One").build()));
        when(users.findAllById(anyIterable())).thenReturn(List.of(
                User.builder().userId("participant-1").name("One").build(),
                User.builder().userId("participant-2").name("Two").build(),
                User.builder().userId("participant-3").name("Three").build()));
        when(results.save(any(JudgingResult.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(rounds.save(round)).thenReturn(round);

        JudgingResultService service = new JudgingResultService(
                rounds, competitions, assignments, evaluations, results,
                registrations, activities, teams, users, ownershipValidator, transactionRunner);
        return service.publishResults("round-1", "organizer-1");
    }

    private ActivityRegistration individual(String id, String participantId) {
        return ActivityRegistration.builder()
                .id(id)
                .activityId("activity-1")
                .participantId(participantId)
                .registrationType(RegistrationType.INDIVIDUAL)
                .status(RegistrationStatus.APPROVED)
                .build();
    }

    private JudgeEvaluation evaluation(String registrationId, String score) {
        return JudgeEvaluation.builder()
                .roundId("round-1")
                .registrationId(registrationId)
                .judgeId("judge-1")
                .status(JudgeEvaluationStatus.SUBMITTED)
                .totalScore(new BigDecimal(score))
                .build();
    }

    private <T> Supplier<T> anySupplier() {
        return org.mockito.ArgumentMatchers.<Supplier<T>>any();
    }
}
