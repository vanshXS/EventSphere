package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import com.vansh.eventsphere.eventsphere.event.service.validators.ActivityOwnershipValidator;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.judge.dto.CompetitionResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.CreateCompetitionRequest;
import com.vansh.eventsphere.eventsphere.judge.model.Competition;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.CompetitionMode;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.RankingPolicy;
import com.vansh.eventsphere.eventsphere.judge.repository.CompetitionRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.service.mapper.CompetitionMapper;
import com.vansh.eventsphere.eventsphere.judge.service.validator.CompetitionValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompetitionServiceTest {

    @Mock private ActivityOwnershipValidator ownershipValidator;
    @Mock private CompetitionValidator competitionValidator;
    @Mock private CompetitionMapper mapper;
    @Mock private CompetitionRepository competitions;
    @Mock private JudgingRoundRepository rounds;

    @Test
    void preventsRankingPolicyChangesAfterJudgingStarts() {
        Competition competition = Competition.builder()
                .activityId("activity-1")
                .judgingEnabled(true)
                .competitionMode(CompetitionMode.MULTI_ROUND)
                .rankingPolicy(RankingPolicy.SEPARATE_BY_ENTRY_TYPE)
                .build();
        CompetitionService service = service();
        when(ownershipValidator.getAndValidateOwnedActivity("activity-1", "organizer-1"))
                .thenReturn(Activity.builder()
                        .id("activity-1")
                        .registrationType(RegistrationType.BOTH)
                        .build());
        when(competitions.findByActivityId("activity-1"))
                .thenReturn(Optional.of(competition));
        when(rounds.findByActivityIdOrderBySequenceAsc("activity-1"))
                .thenReturn(List.of(JudgeRound.builder()
                        .id("round-1")
                        .status(JudgingRoundStatus.OPEN)
                        .build()));

        CreateCompetitionRequest request = request(RankingPolicy.COMBINED_ALL_ENTRIES);
        assertThrows(BadRequestException.class, () -> service.updateForActivity(
                "activity-1", request, "organizer-1"));
        verify(competitions, never()).save(any(Competition.class));
        assertEquals(RankingPolicy.SEPARATE_BY_ENTRY_TYPE, competition.getRankingPolicy());
    }

    @Test
    void allowsRankingPolicyChangesBeforeJudgingStarts() {
        Competition competition = Competition.builder()
                .activityId("activity-1")
                .judgingEnabled(true)
                .competitionMode(CompetitionMode.MULTI_ROUND)
                .rankingPolicy(RankingPolicy.SEPARATE_BY_ENTRY_TYPE)
                .build();
        CompetitionService service = service();
        when(ownershipValidator.getAndValidateOwnedActivity("activity-1", "organizer-1"))
                .thenReturn(Activity.builder()
                        .id("activity-1")
                        .registrationType(RegistrationType.BOTH)
                        .build());
        when(competitions.findByActivityId("activity-1"))
                .thenReturn(Optional.of(competition));
        when(rounds.findByActivityIdOrderBySequenceAsc("activity-1"))
                .thenReturn(List.of(JudgeRound.builder()
                        .id("round-1")
                        .status(JudgingRoundStatus.DRAFT)
                        .build()));
        when(competitions.save(competition)).thenReturn(competition);
        when(mapper.toResponse(competition)).thenReturn(
                CompetitionResponse.builder()
                        .rankingPolicy(RankingPolicy.COMBINED_ALL_ENTRIES)
                        .build());

        CompetitionResponse response = service.updateForActivity(
                "activity-1",
                request(RankingPolicy.COMBINED_ALL_ENTRIES),
                "organizer-1");

        assertEquals(RankingPolicy.COMBINED_ALL_ENTRIES, competition.getRankingPolicy());
        assertEquals(RankingPolicy.COMBINED_ALL_ENTRIES, response.getRankingPolicy());
    }

    private CompetitionService service() {
        return new CompetitionService(
                ownershipValidator, competitionValidator, mapper, competitions, rounds);
    }

    private CreateCompetitionRequest request(RankingPolicy policy) {
        CreateCompetitionRequest request = new CreateCompetitionRequest();
        request.setJudgingEnabled(true);
        request.setCompetitionMode(CompetitionMode.MULTI_ROUND);
        request.setRankingPolicy(policy);
        return request;
    }
}
