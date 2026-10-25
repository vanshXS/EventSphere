package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.judge.dto.SaveJudgeEvaluationRequest;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeEvaluationRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.service.mapper.JudgeEvaluationMapper;
import com.vansh.eventsphere.eventsphere.judge.service.validator.JudgeEvaluationValidator;
import com.vansh.eventsphere.eventsphere.judge.service.calculators.ScoreCalculator;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JudgeEvaluationServiceTest {

    @Mock private JudgingRoundRepository rounds;
    @Mock private JudgeAssignmentRepository assignments;
    @Mock private JudgeEvaluationRepository evaluations;
    @Mock private ActivityRegistrationRepository registrations;
    @Mock private UserRepository users;
    @Mock private JudgeEvaluationValidator validator;
    @Mock private ScoreCalculator scoreCalculator;
    @Mock private JudgeEvaluationMapper mapper;

    @Test
    void revokedJudgeCannotSaveMoreScores() {
        JudgeEvaluationService service = new JudgeEvaluationService(
                rounds, assignments, evaluations, registrations, users,
                validator, scoreCalculator, mapper);
        when(rounds.findById("round-1")).thenReturn(Optional.of(JudgeRound.builder()
                .id("round-1")
                .activityId("activity-1")
                .status(JudgingRoundStatus.OPEN)
                .build()));
        when(users.findById("judge-1")).thenReturn(Optional.of(User.builder()
                .userId("judge-1")
                .email("judge@example.com")
                .role(Role.JUDGE)
                .active(true)
                .build()));
        when(assignments.findByRoundIdAndJudgeId("round-1", "judge-1"))
                .thenReturn(Optional.of(JudgeAssignment.builder()
                        .roundId("round-1")
                        .judgeId("judge-1")
                        .status(JudgeAssignmentStatus.REVOKED)
                        .build()));

        assertThrows(AccessDeniedException.class, () -> service.saveDraft(
                "round-1",
                "registration-1",
                new SaveJudgeEvaluationRequest(List.of(), null),
                "judge-1"));

        verify(users).findById("judge-1");
        verify(users, never()).findByEmail("judge@example.com");
        verify(registrations, never()).findById("registration-1");
        verify(evaluations, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
