package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.TeamRepository;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeAssignedRoundResponse;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeEvaluationRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.service.mapper.JudgeDashboardMapper;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JudgeDashboardServiceTest {

    @Mock private UserRepository users;
    @Mock private ActivityRepository activities;
    @Mock private ActivityRegistrationRepository registrations;
    @Mock private TeamRepository teams;
    @Mock private JudgingRoundRepository rounds;
    @Mock private JudgeAssignmentRepository assignments;
    @Mock private JudgeEvaluationRepository evaluations;
    @Mock private JudgeDashboardMapper mapper;

    @Test
    void returnsAssignmentsForAuthenticatedJudgeUserId() {
        JudgeDashboardService service = new JudgeDashboardService(
                users, activities, registrations, teams, rounds, assignments,
                evaluations, mapper);
        User judge = User.builder()
                .userId("judge-1")
                .email("judge@example.com")
                .role(Role.JUDGE)
                .active(true)
                .build();
        JudgeAssignment assignment = JudgeAssignment.builder()
                .id("assignment-1")
                .roundId("round-1")
                .judgeId("judge-1")
                .status(JudgeAssignmentStatus.ACTIVE)
                .build();
        JudgeRound round = JudgeRound.builder()
                .id("round-1")
                .activityId("activity-1")
                .build();
        Activity activity = Activity.builder()
                .id("activity-1")
                .name("Demo activity")
                .build();
        JudgeAssignedRoundResponse expected = JudgeAssignedRoundResponse.builder()
                .assignmentId("assignment-1")
                .roundId("round-1")
                .build();

        when(users.findById("judge-1")).thenReturn(Optional.of(judge));
        when(assignments.findByJudgeIdAndStatus(
                "judge-1", JudgeAssignmentStatus.ACTIVE))
                .thenReturn(List.of(assignment));
        when(rounds.findById("round-1")).thenReturn(Optional.of(round));
        when(activities.findById("activity-1")).thenReturn(Optional.of(activity));
        when(mapper.toAssignedRoundResponse(assignment, round, activity))
                .thenReturn(expected);

        List<JudgeAssignedRoundResponse> actual =
                service.getMyAssignedRounds("judge-1");

        assertEquals(List.of(expected), actual);
        verify(users).findById("judge-1");
        verify(users, never()).findByEmail("judge-1");
    }
}
