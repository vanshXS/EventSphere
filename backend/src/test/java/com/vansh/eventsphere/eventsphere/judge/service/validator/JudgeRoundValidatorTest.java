package com.vansh.eventsphere.eventsphere.judge.service.validator;

import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.service.validators.ActivityOwnershipValidator;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.CompetitionRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JudgeRoundValidatorTest {

    @Mock
    private ActivityRepository activityRepository;
    @Mock
    private EventRepository eventRepository;
    @Mock
    private JudgingRoundRepository judgingRoundRepository;
    @Mock
    private JudgeAssignmentRepository judgeAssignmentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CompetitionRepository competitionRepository;
    @Mock
    private ActivityOwnershipValidator activityOwnershipValidator;

    private JudgeRoundValidator validator;

    @BeforeEach
    void setUp() {
        validator = new JudgeRoundValidator(
                activityRepository,
                eventRepository,
                judgingRoundRepository,
                judgeAssignmentRepository,
                userRepository,
                competitionRepository,
                activityOwnershipValidator);
    }

    @Test
    void draftRoundRemainsEditable() {
        JudgeRound round = JudgeRound.builder()
                .id("round-1")
                .status(JudgingRoundStatus.DRAFT)
                .build();
        when(judgingRoundRepository.findById("round-1")).thenReturn(Optional.of(round));

        assertEquals(round, validator.getAndValidateDraftRound("round-1"));
    }

    @Test
    void openedRoundCannotBeEdited() {
        JudgeRound round = JudgeRound.builder()
                .id("round-1")
                .status(JudgingRoundStatus.OPEN)
                .build();
        when(judgingRoundRepository.findById("round-1")).thenReturn(Optional.of(round));

        assertThrows(BadRequestException.class,
                () -> validator.getAndValidateDraftRound("round-1"));
    }

    @Test
    void rejectsRoundEndThatIsNotAfterStart() {
        LocalDateTime start = LocalDateTime.of(2026, 5, 10, 10, 0);
        assertThrows(BadRequestException.class, () -> validator.validateSchedule(
                Activity.builder().id("activity-1").build(),
                null,
                start,
                start,
                "Asia/Kolkata"));
    }

    @Test
    void rejectsScheduleOutsideActivityBoundaries() {
        Activity activity = Activity.builder()
                .id("activity-1")
                .startDateTime(LocalDateTime.of(2026, 5, 10, 10, 0))
                .endDateTime(LocalDateTime.of(2026, 5, 10, 18, 0))
                .build();

        assertThrows(BadRequestException.class, () -> validator.validateSchedule(
                activity,
                null,
                LocalDateTime.of(2026, 5, 10, 9, 0),
                LocalDateTime.of(2026, 5, 10, 11, 0),
                "Asia/Kolkata"));
        assertThrows(BadRequestException.class, () -> validator.validateSchedule(
                activity,
                null,
                LocalDateTime.of(2026, 5, 10, 17, 0),
                LocalDateTime.of(2026, 5, 10, 19, 0),
                "Asia/Kolkata"));
    }

    @Test
    void rejectsOverlappingRoundsButIgnoresDraftsWithoutSchedules() {
        LocalDateTime start = LocalDateTime.of(2026, 5, 10, 12, 0);
        JudgeRound unscheduled = JudgeRound.builder().id("round-1").build();
        JudgeRound overlapping = JudgeRound.builder()
                .id("round-2")
                .scheduledStartDateTime(start.minusMinutes(30))
                .scheduledEndDateTime(start.plusMinutes(30))
                .build();
        when(judgingRoundRepository.findByActivityIdOrderBySequenceAsc("activity-1"))
                .thenReturn(List.of(unscheduled, overlapping));

        assertThrows(BadRequestException.class, () -> validator.validateSchedule(
                Activity.builder().id("activity-1").build(),
                "round-3",
                start,
                start.plusHours(1),
                "Asia/Kolkata"));
    }

    @Test
    void acceptsNonOverlappingRoundsOnDifferentDays() {
        LocalDateTime start = LocalDateTime.of(2026, 5, 11, 12, 0);
        when(judgingRoundRepository.findByActivityIdOrderBySequenceAsc("activity-1"))
                .thenReturn(List.of(JudgeRound.builder()
                        .id("round-1")
                        .scheduledStartDateTime(start.minusDays(1))
                        .scheduledEndDateTime(start.minusDays(1).plusHours(1))
                        .build()));

        validator.validateSchedule(
                Activity.builder().id("activity-1").build(),
                "round-2",
                start,
                start.plusHours(1),
                "Asia/Kolkata");
    }

    @Test
    void rejectsInvalidTimezoneId() {
        LocalDateTime start = LocalDateTime.of(2026, 5, 10, 10, 0);
        assertThrows(BadRequestException.class, () -> validator.validateSchedule(
                Activity.builder().id("activity-1").build(),
                null,
                start,
                start.plusHours(1),
                "Not/A_Timezone"));
    }

    @Test
    void resolvesOnlyActiveJudgeByNormalizedEmail() {
        User judge = User.builder()
                .userId("judge-1")
                .email("judge@example.com")
                .role(Role.JUDGE)
                .active(true)
                .build();
        when(userRepository.findByEmail("judge@example.com"))
                .thenReturn(Optional.of(judge));

        assertEquals(judge, validator.getAndValidateActiveJudgeByEmail(" Judge@Example.com "));
    }

    @Test
    void refusesNonJudgeAccountsForEmailAssignment() {
        User participant = User.builder()
                .userId("participant-1")
                .email("judge@example.com")
                .role(Role.PARTICIPANT)
                .active(true)
                .build();
        when(userRepository.findByEmail("judge@example.com"))
                .thenReturn(Optional.of(participant));

        assertThrows(BadRequestException.class,
                () -> validator.getAndValidateActiveJudgeByEmail("judge@example.com"));
    }
}
