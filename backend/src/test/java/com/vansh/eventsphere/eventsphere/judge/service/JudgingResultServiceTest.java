package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import com.vansh.eventsphere.eventsphere.event.model.Team;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
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
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JudgingResultServiceTest {

    @Mock private JudgingRoundRepository rounds;
    @Mock private CompetitionRepository competitions;
    @Mock private JudgeAssignmentRepository assignments;
    @Mock private JudgeEvaluationRepository evaluations;
    @Mock private JudgingResultRepository results;
    @Mock private ActivityRegistrationRepository registrations;
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
                registrations, teams, users, ownershipValidator, transactionRunner);
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
