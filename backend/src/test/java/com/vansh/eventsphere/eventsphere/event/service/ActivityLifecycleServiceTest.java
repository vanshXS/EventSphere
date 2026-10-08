package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.dto.ActivityResponse;
import com.vansh.eventsphere.eventsphere.event.dto.CreateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.dto.UpdateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.model.*;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.AttendanceRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.event.service.mappers.ActivityMapper;
import com.vansh.eventsphere.eventsphere.event.service.validators.ActivityValidator;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActivityLifecycleServiceTest {

    @Mock
    private ActivityRepository activityRepository;
    @Mock
    private EventRepository eventRepository;
    @Mock
    private ActivityRegistrationRepository activityRegistrationRepository;
    @Mock
    private EventRegistrationRepository eventRegistrationRepository;
    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private TransactionRunner transactionRunner;

    private ActivityValidator activityValidator;
    private ActivityMapper activityMapper;
    private ActivityService activityService;
    private EventStatusSchedular eventStatusSchedular;

    private final String organizerId = "organizer-123";
    private final String otherOrganizerId = "unauthorized-organizer";
    private final String activityId = "act-456";
    private final String eventId = "evt-789";

    @BeforeEach
    void setUp() {
        activityValidator = new ActivityValidator();
        activityMapper = new ActivityMapper();

        // Lenient transaction runner mock: execute supplied work directly
        lenient().when(transactionRunner.run(any(Supplier.class))).thenAnswer(invocation -> {
            Supplier<?> supplier = invocation.getArgument(0);
            return supplier.get();
        });

        lenient().when(activityRepository.existsById(activityId)).thenReturn(true);
        lenient().when(activityRepository.save(any(Activity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        activityService = new ActivityService(
                activityRepository,
                activityValidator,
                eventRepository,
                activityMapper,
                transactionRunner,
                activityRegistrationRepository,
                eventRegistrationRepository,
                attendanceRepository
        );

        eventStatusSchedular = new EventStatusSchedular(
                eventRepository,
                activityRepository
        );
    }

    private Activity createSampleActivity(EventStatus status, LocalDateTime start, LocalDateTime end) {
        return Activity.builder()
                .id(activityId)
                .organizerId(organizerId)
                .eventId(eventId)
                .name("Hackathon Sprint")
                .description("Intensive sprint coding activity")
                .type(ActivityType.HACKATHON)
                .status(status)
                .startDateTime(start)
                .endDateTime(end)
                .registrationDeadline(start != null ? start.minusHours(2) : null)
                .registrationType(RegistrationType.INDIVIDUAL)
                .capacity(100)
                .build();
    }

    // ---------------------------------------------------------------------------------
    // 1. Published activity before scheduled time
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("1. Published activity before scheduled time: remains PUBLISHED and actual times are null")
    void test1_PublishedActivityBeforeScheduledTime() {
        LocalDateTime now = LocalDateTime.now();
        Activity activity = createSampleActivity(
                EventStatus.PUBLISHED,
                now.plusHours(2),
                now.plusHours(4)
        );

        when(activityRepository.findByStatusIn(any())).thenReturn(List.of(activity));

        eventStatusSchedular.updateStatus();

        assertEquals(EventStatus.PUBLISHED, activity.getStatus());
        assertNull(activity.getActualStartDateTime());
        assertNull(activity.getActualEndDateTime());
        verify(activityRepository, never()).save(activity);
    }

    // ---------------------------------------------------------------------------------
    // 2. Published activity after scheduled time but not manually started
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("2. Published activity after scheduled time: remains PUBLISHED (scheduler does NOT auto-start)")
    void test2_PublishedActivityAfterScheduledTime_NotManuallyStarted() {
        LocalDateTime now = LocalDateTime.now();
        Activity activity = createSampleActivity(
                EventStatus.PUBLISHED,
                now.minusMinutes(30),
                now.plusHours(1)
        );

        when(activityRepository.findByStatusIn(any())).thenReturn(List.of(activity));

        eventStatusSchedular.updateStatus();

        // Status must NOT be changed by scheduler merely because startDateTime has passed
        assertEquals(EventStatus.PUBLISHED, activity.getStatus());
        assertNull(activity.getActualStartDateTime());
        verify(activityRepository, never()).save(activity);
    }

    // ---------------------------------------------------------------------------------
    // 3. Organizer starts activity before scheduled time
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("3. Organizer starts activity before scheduled time: becomes ONGOING with actualStartDateTime set")
    void test3_OrganizerStartsActivity_BeforeScheduledTime() {
        LocalDateTime now = LocalDateTime.now();
        Activity activity = createSampleActivity(
                EventStatus.PUBLISHED,
                now.plusHours(1),
                now.plusHours(3)
        );

        when(activityRepository.findById(activityId)).thenReturn(Optional.of(activity));

        ActivityResponse response = activityService.startActivity(activityId, organizerId);

        assertEquals(EventStatus.ONGOING, response.getStatus());
        assertNotNull(response.getActualStartDateTime());
        assertNull(response.getActualEndDateTime());
        assertEquals(activity.getStartDateTime(), response.getStartDateTime());
        verify(activityRepository).save(activity);
    }

    // ---------------------------------------------------------------------------------
    // 4. Organizer starts activity after scheduled time
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("4. Organizer starts activity after scheduled time: becomes ONGOING with actualStartDateTime set")
    void test4_OrganizerStartsActivity_AfterScheduledTime() {
        LocalDateTime now = LocalDateTime.now();
        Activity activity = createSampleActivity(
                EventStatus.PUBLISHED,
                now.minusMinutes(20),
                now.plusHours(1)
        );

        when(activityRepository.findById(activityId)).thenReturn(Optional.of(activity));

        ActivityResponse response = activityService.startActivity(activityId, organizerId);

        assertEquals(EventStatus.ONGOING, response.getStatus());
        assertNotNull(response.getActualStartDateTime());
        assertNull(response.getActualEndDateTime());
        verify(activityRepository).save(activity);
    }

    // ---------------------------------------------------------------------------------
    // 5. Cannot start already ongoing activity
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("5. Cannot start already ongoing activity: throws BadRequestException")
    void test5_CannotStartAlreadyOngoingActivity() {
        LocalDateTime now = LocalDateTime.now();
        Activity activity = createSampleActivity(
                EventStatus.ONGOING,
                now.minusMinutes(30),
                now.plusHours(1)
        );
        activity.setActualStartDateTime(now.minusMinutes(25));

        when(activityRepository.findById(activityId)).thenReturn(Optional.of(activity));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                activityService.startActivity(activityId, organizerId)
        );
        assertEquals("Activity has already started.", ex.getMessage());
    }

    // ---------------------------------------------------------------------------------
    // 6. Cannot complete published activity
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("6. Cannot complete published activity: throws BadRequestException")
    void test6_CannotCompletePublishedActivity() {
        LocalDateTime now = LocalDateTime.now();
        Activity activity = createSampleActivity(
                EventStatus.PUBLISHED,
                now.minusMinutes(10),
                now.plusHours(1)
        );

        when(activityRepository.findById(activityId)).thenReturn(Optional.of(activity));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                activityService.completeActivity(activityId, organizerId)
        );
        assertEquals("Cannot complete a published activity that has not started.", ex.getMessage());
    }

    // ---------------------------------------------------------------------------------
    // 7. Organizer completes ongoing activity
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("7. Organizer completes ongoing activity: becomes COMPLETED with actualEndDateTime set")
    void test7_OrganizerCompletesOngoingActivity() {
        LocalDateTime now = LocalDateTime.now();
        Activity activity = createSampleActivity(
                EventStatus.ONGOING,
                now.minusMinutes(45),
                now.plusMinutes(15)
        );
        LocalDateTime actualStart = now.minusMinutes(40);
        activity.setActualStartDateTime(actualStart);

        when(activityRepository.findById(activityId)).thenReturn(Optional.of(activity));

        ActivityResponse response = activityService.completeActivity(activityId, organizerId);

        assertEquals(EventStatus.COMPLETED, response.getStatus());
        assertNotNull(response.getActualEndDateTime());
        assertTrue(response.getActualEndDateTime().isAfter(actualStart));
        verify(activityRepository).save(activity);
    }

    // ---------------------------------------------------------------------------------
    // 8. Cannot complete already completed activity
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("8. Cannot complete already completed activity: throws BadRequestException")
    void test8_CannotCompleteAlreadyCompletedActivity() {
        LocalDateTime now = LocalDateTime.now();
        Activity activity = createSampleActivity(
                EventStatus.COMPLETED,
                now.minusHours(2),
                now.minusHours(1)
        );
        activity.setActualStartDateTime(now.minusHours(2));
        activity.setActualEndDateTime(now.minusHours(1));

        when(activityRepository.findById(activityId)).thenReturn(Optional.of(activity));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                activityService.completeActivity(activityId, organizerId)
        );
        assertEquals("Activity has already been completed.", ex.getMessage());
    }

    // ---------------------------------------------------------------------------------
    // 9. Actual end later than scheduled end is allowed
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("9. Actual end later than scheduled end is allowed without ActivityValidator failure")
    void test9_ActualEndLaterThanScheduledEnd_Allowed() {
        LocalDateTime base = LocalDateTime.now().minusHours(2);
        // Scheduled: 10:00 -> 11:00
        LocalDateTime scheduledStart = base;
        LocalDateTime scheduledEnd = base.plusHours(1);

        // Actual operational: 10:20 -> 11:15 (exceeded scheduled end by 15 mins)
        LocalDateTime actualStart = base.plusMinutes(20);
        LocalDateTime actualEnd = scheduledEnd.plusMinutes(15);

        Activity activity = createSampleActivity(EventStatus.ONGOING, scheduledStart, scheduledEnd);
        activity.setActualStartDateTime(actualStart);

        when(activityRepository.findById(activityId)).thenReturn(Optional.of(activity));

        ActivityResponse response = activityService.completeActivity(activityId, organizerId);
        assertEquals(EventStatus.COMPLETED, response.getStatus());

        // Now validate with ActivityValidator: scheduled times are strictly preserved and validator succeeds
        Event parentEvent = Event.builder()
                .id(eventId)
                .organizerId(organizerId)
                .startDateTime(base.minusHours(1))
                .endDateTime(base.plusHours(5))
                .build();

        assertDoesNotThrow(() -> activityValidator.validate(activity, parentEvent));
    }

    // ---------------------------------------------------------------------------------
    // 10. Existing ActivityValidator still validates scheduled times correctly
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("10. Existing ActivityValidator validates scheduled times correctly")
    void test10_ActivityValidator_ValidatesScheduledTimes() {
        LocalDateTime now = LocalDateTime.now();

        // End before start throws exception
        Activity invalidEnd = createSampleActivity(EventStatus.PUBLISHED, now.plusHours(2), now.plusHours(1));
        BadRequestException ex1 = assertThrows(BadRequestException.class, () ->
                activityValidator.validate(invalidEnd, null)
        );
        assertEquals("Activity end time must be after its start time.", ex1.getMessage());

        // Missing start/end
        Activity missingTimes = createSampleActivity(EventStatus.PUBLISHED, null, null);
        assertThrows(BadRequestException.class, () -> activityValidator.validate(missingTimes, null));
    }

    // ---------------------------------------------------------------------------------
    // 11. Event-boundary validation still uses scheduled Activity times
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("11. Event-boundary validation uses scheduled Activity times")
    void test11_EventBoundaryValidation_UsesScheduledTimes() {
        LocalDateTime now = LocalDateTime.now();
        Event parentEvent = Event.builder()
                .id(eventId)
                .organizerId(organizerId)
                .startDateTime(now.plusHours(1))
                .endDateTime(now.plusHours(5))
                .build();

        // Scheduled start before parent event start
        Activity outsideStart = createSampleActivity(EventStatus.PUBLISHED, now.plusMinutes(30), now.plusHours(3));
        BadRequestException ex1 = assertThrows(BadRequestException.class, () ->
                activityValidator.validate(outsideStart, parentEvent)
        );
        assertEquals("Activity start time must be within the Event schedule.", ex1.getMessage());

        // Scheduled end after parent event end
        Activity outsideEnd = createSampleActivity(EventStatus.PUBLISHED, now.plusHours(2), now.plusHours(6));
        BadRequestException ex2 = assertThrows(BadRequestException.class, () ->
                activityValidator.validate(outsideEnd, parentEvent)
        );
        assertEquals("Activity end time must be within the Event schedule.", ex2.getMessage());

        // Within boundaries passes
        Activity inside = createSampleActivity(EventStatus.PUBLISHED, now.plusHours(2), now.plusHours(4));
        assertDoesNotThrow(() -> activityValidator.validate(inside, parentEvent));
    }

    // ---------------------------------------------------------------------------------
    // 12. Registration deadline validation still uses scheduled Activity start
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("12. Registration deadline validation still uses scheduled Activity start")
    void test12_RegistrationDeadline_UsesScheduledActivityStart() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime scheduledStart = now.plusHours(3);
        LocalDateTime scheduledEnd = now.plusHours(5);

        Activity activity = createSampleActivity(EventStatus.PUBLISHED, scheduledStart, scheduledEnd);
        // Deadline after scheduled start
        activity.setRegistrationDeadline(scheduledStart.plusMinutes(10));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                activityValidator.validate(activity, null)
        );
        assertEquals("Registration deadline must be before the activity starts.", ex.getMessage());
    }

    // ---------------------------------------------------------------------------------
    // 13. Unauthorized organizer cannot start/complete another organizer's activity
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("13. Unauthorized organizer cannot start or complete activity: throws BadRequestException")
    void test13_UnauthorizedOrganizer_CannotStartOrComplete() {
        LocalDateTime now = LocalDateTime.now();
        Activity activity = createSampleActivity(
                EventStatus.PUBLISHED,
                now.plusHours(1),
                now.plusHours(3)
        );

        when(activityRepository.findById(activityId)).thenReturn(Optional.of(activity));

        BadRequestException startEx = assertThrows(BadRequestException.class, () ->
                activityService.startActivity(activityId, otherOrganizerId)
        );
        assertEquals("You are not allowed to modify this activity.", startEx.getMessage());

        activity.setStatus(EventStatus.ONGOING);
        activity.setActualStartDateTime(now);

        BadRequestException completeEx = assertThrows(BadRequestException.class, () ->
                activityService.completeActivity(activityId, otherOrganizerId)
        );
        assertEquals("You are not allowed to modify this activity.", completeEx.getMessage());
    }

    // ---------------------------------------------------------------------------------
    // 14. Existing Activity creation/update tests continue passing
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("14. Activity creation and update continue working as expected")
    void test14_ActivityCreationAndUpdate_ContinuesWorking() {
        LocalDateTime now = LocalDateTime.now();
        Event parentEvent = Event.builder()
                .id(eventId)
                .organizerId(organizerId)
                .startDateTime(now.plusHours(1))
                .endDateTime(now.plusHours(6))
                .build();

        when(eventRepository.findById(eventId)).thenReturn(Optional.of(parentEvent));

        CreateActivityRequest createRequest = new CreateActivityRequest();
        createRequest.setName("AI Hack");
        createRequest.setDescription("Hackathon for AI applications");
        createRequest.setType(ActivityType.HACKATHON);
        createRequest.setRules("Standard code rules");
        createRequest.setRegistrationType(RegistrationType.INDIVIDUAL);
        createRequest.setStartDateTime(now.plusHours(2));
        createRequest.setEndDateTime(now.plusHours(4));
        createRequest.setRegistrationDeadline(now.plusHours(1).plusMinutes(30));
        createRequest.setCapacity(50);

        ActivityResponse created = activityService.createActivity(createRequest, eventId, organizerId);
        assertNotNull(created);
        assertEquals("AI Hack", created.getName());
        assertEquals(EventStatus.PUBLISHED, created.getStatus());
        assertNull(created.getActualStartDateTime());
        assertNull(created.getActualEndDateTime());

        // Update
        Activity existing = createSampleActivity(EventStatus.PUBLISHED, now.plusHours(2), now.plusHours(4));
        when(activityRepository.findById(activityId)).thenReturn(Optional.of(existing));

        UpdateActivityRequest updateRequest = new UpdateActivityRequest();
        updateRequest.setName("AI Hack Updated");
        updateRequest.setDescription("Updated description for AI hackathon");
        updateRequest.setType(ActivityType.HACKATHON);
        updateRequest.setRules("Updated rules");
        updateRequest.setRegistrationType(RegistrationType.INDIVIDUAL);
        updateRequest.setStartDateTime(now.plusHours(2).plusMinutes(15));
        updateRequest.setEndDateTime(now.plusHours(4));
        updateRequest.setRegistrationDeadline(now.plusHours(1).plusMinutes(30));
        updateRequest.setCapacity(60);

        ActivityResponse updated = activityService.updateActivity(activityId, updateRequest, organizerId);
        assertNotNull(updated);
        assertEquals("AI Hack Updated", updated.getName());
        assertEquals(now.plusHours(2).plusMinutes(15), updated.getStartDateTime());
    }

    // ---------------------------------------------------------------------------------
    // 15. Existing scheduler tests continue passing after the lifecycle change
    // ---------------------------------------------------------------------------------
    @Test
    @DisplayName("15. Scheduler does not mutate Activity status: ongoing past scheduled end remains ONGOING")
    void test15_SchedulerDoesNotMutateActivityStatus() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Ongoing activity that exceeded its scheduled end time
        Activity ongoingOverrun = createSampleActivity(
                EventStatus.ONGOING,
                now.minusHours(2),
                now.minusMinutes(15)
        );
        ongoingOverrun.setActualStartDateTime(now.minusHours(2));

        // 2. Published activity whose start time has arrived
        Activity publishedPastStart = createSampleActivity(
                EventStatus.PUBLISHED,
                now.minusMinutes(10),
                now.plusHours(1)
        );

        when(activityRepository.findByStatusIn(any())).thenReturn(List.of(ongoingOverrun, publishedPastStart));

        eventStatusSchedular.updateStatus();

        // Neither activity status should be mutated by the scheduler
        assertEquals(EventStatus.ONGOING, ongoingOverrun.getStatus());
        assertNull(ongoingOverrun.getActualEndDateTime());

        assertEquals(EventStatus.PUBLISHED, publishedPastStart.getStatus());
        assertNull(publishedPastStart.getActualStartDateTime());

        verify(activityRepository, never()).save(ongoingOverrun);
        verify(activityRepository, never()).save(publishedPastStart);
    }
}
