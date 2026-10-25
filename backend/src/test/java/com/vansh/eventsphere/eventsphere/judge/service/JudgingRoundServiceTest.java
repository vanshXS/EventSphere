package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeRoundResponse;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeEvaluation;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeEvaluationStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeEvaluationRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.judge.service.mapper.JudgeRoundMapper;
import com.vansh.eventsphere.eventsphere.judge.service.validator.JudgeRoundValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JudgingRoundServiceTest {

    @Mock
    private JudgeRoundValidator validator;
    @Mock
    private JudgeRoundMapper mapper;
    @Mock
    private JudgingRoundRepository repository;
    @Mock
    private JudgeAssignmentRepository assignmentRepository;
    @Mock
    private JudgeEvaluationRepository evaluationRepository;
    @Mock
    private ActivityRegistrationRepository registrationRepository;

    private JudgingRoundService service;

    @BeforeEach
    void setUp() {
        service = new JudgingRoundService(
                validator,
                mapper,
                repository,
                assignmentRepository,
                evaluationRepository,
                registrationRepository);
    }

    @Test
    void openRoundRejectsActivityThatHasNotActuallyStarted() {
        JudgeRound round = draftRound();
        Activity activity = Activity.builder().id("activity-1").build();
        when(validator.getAndValidateDraftRound("round-1")).thenReturn(round);
        when(validator.getAndValidateJudgingActivity("activity-1", "organizer-1"))
                .thenReturn(activity);

        assertThrows(BadRequestException.class,
                () -> service.openRound("round-1", "organizer-1"));

        verify(repository, never()).save(any(JudgeRound.class));
    }

    @Test
    void openRoundAllowsStartedActivityEvenIfItHasEnded() {
        JudgeRound round = draftRound();
        Activity activity = Activity.builder()
                .id("activity-1")
                .actualStartDateTime(LocalDateTime.now().minusDays(1))
                .actualEndDateTime(LocalDateTime.now().minusHours(1))
                .build();
        when(validator.getAndValidateDraftRound("round-1")).thenReturn(round);
        when(validator.getAndValidateJudgingActivity("activity-1", "organizer-1"))
                .thenReturn(activity);
        when(repository.save(round)).thenReturn(round);
        when(mapper.toRoundResponse(round)).thenReturn(
                JudgeRoundResponse.builder().id("round-1").status(JudgingRoundStatus.OPEN).build());

        JudgeRoundResponse response = service.openRound("round-1", "organizer-1");

        assertEquals(JudgingRoundStatus.OPEN, response.getStatus());
        assertEquals(JudgingRoundStatus.OPEN, round.getStatus());
        assertNotNull(round.getOpenedAt());
        verify(validator).validateRoundCanOpen(round);
    }

    @Test
    void openRoundAllowsLegacyOngoingActivityWithoutActualStartTimestamp() {
        JudgeRound round = draftRound();
        Activity activity = Activity.builder()
                .id("activity-1")
                .status(EventStatus.ONGOING)
                .build();
        when(validator.getAndValidateDraftRound("round-1")).thenReturn(round);
        when(validator.getAndValidateJudgingActivity("activity-1", "organizer-1"))
                .thenReturn(activity);
        when(repository.save(round)).thenReturn(round);
        when(mapper.toRoundResponse(round)).thenReturn(
                JudgeRoundResponse.builder().id("round-1").status(JudgingRoundStatus.OPEN).build());

        JudgeRoundResponse response = service.openRound("round-1", "organizer-1");

        assertEquals(JudgingRoundStatus.OPEN, response.getStatus());
        verify(validator).validateRoundCanOpen(round);
    }

    @Test
    void closeRoundRemainsOpenWhileRequiredEvaluationsAreMissing() {
        JudgeRound round = openRound();
        when(validator.getAndValidateOpenRound("round-1")).thenReturn(round);
        when(validator.getAndValidateJudgingActivity("activity-1", "organizer-1"))
                .thenReturn(Activity.builder().id("activity-1").build());
        when(assignmentRepository.findByRoundIdAndStatus(
                "round-1", JudgeAssignmentStatus.ACTIVE))
                .thenReturn(List.of(JudgeAssignment.builder().judgeId("judge-1").build()));
        when(registrationRepository.findByActivityIdAndStatusIn(
                eq("activity-1"), any()))
                .thenReturn(List.of(ActivityRegistration.builder().id("entry-1").build()));
        when(evaluationRepository.findByRoundIdAndStatus("round-1", JudgeEvaluationStatus.SUBMITTED))
                .thenReturn(List.of());
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> service.closeRound("round-1", "organizer-1"));

        assertTrue(exception.getMessage().contains("1 required evaluation"));
        verify(repository, never()).save(any(JudgeRound.class));
    }

    @Test
    void closeRoundClosesWhenAllRequiredEvaluationsAreSubmitted() {
        JudgeRound round = openRound();
        when(validator.getAndValidateOpenRound("round-1")).thenReturn(round);
        when(validator.getAndValidateJudgingActivity("activity-1", "organizer-1"))
                .thenReturn(Activity.builder().id("activity-1").build());
        when(assignmentRepository.findByRoundIdAndStatus(
                "round-1", JudgeAssignmentStatus.ACTIVE))
                .thenReturn(List.of(JudgeAssignment.builder().judgeId("judge-1").build()));
        when(registrationRepository.findByActivityIdAndStatusIn(
                eq("activity-1"), any()))
                .thenReturn(List.of(ActivityRegistration.builder().id("entry-1").build()));
        when(evaluationRepository.findByRoundIdAndStatus("round-1", JudgeEvaluationStatus.SUBMITTED))
                .thenReturn(List.of(JudgeEvaluation.builder()
                        .judgeId("judge-1")
                        .registrationId("entry-1")
                        .build()));
        when(repository.save(round)).thenReturn(round);
        when(mapper.toRoundResponse(round)).thenReturn(
                JudgeRoundResponse.builder().id("round-1").status(JudgingRoundStatus.CLOSED).build());
        JudgeRoundResponse response = service.closeRound("round-1", "organizer-1");

        assertEquals(JudgingRoundStatus.CLOSED, response.getStatus());
        assertEquals(JudgingRoundStatus.CLOSED, round.getStatus());
    }

    private JudgeRound draftRound() {
        return JudgeRound.builder()
                .id("round-1")
                .activityId("activity-1")
                .scheduledStartDateTime(LocalDateTime.now().plusHours(1))
                .scheduledEndDateTime(LocalDateTime.now().plusHours(2))
                .status(JudgingRoundStatus.DRAFT)
                .build();
    }

    private JudgeRound openRound() {
        return JudgeRound.builder()
                .id("round-1")
                .activityId("activity-1")
                .status(JudgingRoundStatus.OPEN)
                .build();
    }
}
