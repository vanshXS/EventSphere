package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeAssignmentResponse;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.service.mapper.JudgeRoundMapper;
import com.vansh.eventsphere.eventsphere.judge.service.validator.JudgeRoundValidator;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class JudgeAssignmentServiceTest {

    @Mock private JudgeRoundValidator validator;
    @Mock private JudgingRoundRepository rounds;
    @Mock private JudgeAssignmentRepository assignments;
    @Mock private JudgeRoundMapper mapper;

    @Test
    void revokingDuringAnOpenRoundKeepsTheAssignmentHistoryAndChangesFutureAccess() {
        JudgeAssignment assignment = JudgeAssignment.builder()
                .id("assignment-1")
                .roundId("round-1")
                .judgeId("judge-1")
                .status(JudgeAssignmentStatus.ACTIVE)
                .build();
        JudgeRound round = JudgeRound.builder()
                .id("round-1")
                .activityId("activity-1")
                .status(JudgingRoundStatus.OPEN)
                .build();
        JudgeAssignmentResponse response = JudgeAssignmentResponse.builder()
                .id("assignment-1")
                .status(JudgeAssignmentStatus.REVOKED)
                .build();
        JudgeAssignmentService service = new JudgeAssignmentService(
                validator, rounds, assignments, mapper);

        when(rounds.findById("round-1")).thenReturn(Optional.of(round));
        when(validator.getAndValidateOwnedActivity("activity-1", "organizer-1"))
                .thenReturn(Activity.builder().id("activity-1").build());
        when(assignments.findByRoundIdAndJudgeId("round-1", "judge-1"))
                .thenReturn(Optional.of(assignment));
        when(assignments.save(assignment)).thenReturn(assignment);
        when(mapper.toAssignmentResponse(assignment)).thenReturn(response);

        JudgeAssignmentResponse result =
                service.revokeJudgeFromRound("round-1", "judge-1", "organizer-1");

        assertEquals(JudgeAssignmentStatus.REVOKED, result.getStatus());
        assertEquals(JudgeAssignmentStatus.REVOKED, assignment.getStatus());
        org.junit.jupiter.api.Assertions.assertNotNull(assignment.getRevokedAt());
        verify(assignments).save(assignment);
        verify(assignments, never()).delete(any(JudgeAssignment.class));
    }

    @Test
    void assignsExistingJudgeByEmailWithoutExposingAUserSearchEndpoint() {
        JudgeRound round = JudgeRound.builder()
                .id("round-1")
                .activityId("activity-1")
                .status(JudgingRoundStatus.DRAFT)
                .build();
        User judge = User.builder()
                .userId("judge-1")
                .role(Role.JUDGE)
                .active(true)
                .build();
        JudgeAssignmentResponse response = JudgeAssignmentResponse.builder()
                .roundId("round-1")
                .judgeId("judge-1")
                .status(JudgeAssignmentStatus.ACTIVE)
                .build();
        JudgeAssignmentService service = new JudgeAssignmentService(
                validator, rounds, assignments, mapper);

        when(validator.getAndValidateDraftRound("round-1")).thenReturn(round);
        when(validator.getAndValidateJudgingActivity("activity-1", "organizer-1"))
                .thenReturn(Activity.builder().id("activity-1").build());
        when(validator.getAndValidateActiveJudgeByEmail("judge@example.com"))
                .thenReturn(judge);
        when(assignments.findByRoundIdAndJudgeId("round-1", "judge-1"))
                .thenReturn(Optional.empty());
        when(assignments.save(any(JudgeAssignment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(mapper.toAssignmentResponse(any(JudgeAssignment.class)))
                .thenReturn(response);

        JudgeAssignmentResponse result = service.assignJudgeToRound(
                "round-1", null, "judge@example.com", "organizer-1");

        assertEquals("judge-1", result.getJudgeId());
        assertEquals(JudgeAssignmentStatus.ACTIVE, result.getStatus());
        verify(assignments, times(1)).save(any(JudgeAssignment.class));
    }
}
