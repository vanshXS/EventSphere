package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.dto.CreateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.dto.CreateEventRequest;
import com.vansh.eventsphere.eventsphere.event.model.*;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.AttendanceRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.event.service.validators.ActivityValidator;
import com.vansh.eventsphere.eventsphere.event.service.validators.EventValidator;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    @Mock private AttendanceRepository attendanceRepository;
    @Mock private EventRepository eventRepository;
    @Mock private ActivityRepository activityRepository;
    @Mock private UserRepository userRepository;
    @Mock private TicketService ticketService;
    @Mock private EventStaffService eventStaffService;
    @Mock private TransactionRunner transactionRunner;

    @Test
    void eventCheckInAllowedAfterConfiguredOpeningTimeWhenPublished() {
        AttendanceService service = new AttendanceService(
                attendanceRepository,
                eventRepository,
                activityRepository,
                userRepository,
                ticketService,
                eventStaffService,
                transactionRunner
        );

        Event event = Event.builder()
                .id("event-1")
                .eventStatus(EventStatus.PUBLISHED)
                .startDateTime(LocalDateTime.of(2026, 1, 10, 10, 0))
                .checkInOpensMinutesBeforeStart(30)
                .build();
        Ticket ticket = Ticket.builder().eventId("event-1").scope(TicketScope.EVENT).build();

        org.mockito.Mockito.when(eventRepository.findById("event-1")).thenReturn(java.util.Optional.of(event));

        assertDoesNotThrow(() -> service.validateTicketLifecycle(ticket, CheckInType.EVENT_ENTRY,
                LocalDateTime.of(2026, 1, 10, 9, 45)));

        assertDoesNotThrow(() -> service.validateTicketLifecycle(ticket, CheckInType.EVENT_ENTRY,
                LocalDateTime.of(2026, 1, 10, 9, 30)));

        assertDoesNotThrow(() -> service.validateTicketLifecycle(ticket, CheckInType.EVENT_ENTRY,
                LocalDateTime.of(2026, 1, 10, 9, 31)));
    }

    @Test
    void eventCheckInRejectsBeforeOpeningTimeWithClearMessage() {
        AttendanceService service = new AttendanceService(
                attendanceRepository,
                eventRepository,
                activityRepository,
                userRepository,
                ticketService,
                eventStaffService,
                transactionRunner
        );

        Event event = Event.builder()
                .id("event-1")
                .eventStatus(EventStatus.PUBLISHED)
                .startDateTime(LocalDateTime.of(2026, 2, 1, 12, 0))
                .checkInOpensMinutesBeforeStart(60)
                .build();
        Ticket ticket = Ticket.builder().eventId("event-1").scope(TicketScope.EVENT).build();

        org.mockito.Mockito.when(eventRepository.findById("event-1")).thenReturn(java.util.Optional.of(event));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                service.validateTicketLifecycle(ticket, CheckInType.EVENT_ENTRY,
                        LocalDateTime.of(2026, 2, 1, 10, 59)));
        assertTrue(ex.getMessage().contains("opens at"));
        assertTrue(ex.getMessage().contains("11:00"));
    }

    @Test
    void activityCheckInAllowedDuringPublishedWindow() {
        AttendanceService service = new AttendanceService(
                attendanceRepository,
                eventRepository,
                activityRepository,
                userRepository,
                ticketService,
                eventStaffService,
                transactionRunner
        );

        Activity activity = Activity.builder()
                .id("activity-1")
                .status(EventStatus.PUBLISHED)
                .startDateTime(LocalDateTime.of(2026, 3, 5, 9, 0))
                .endDateTime(LocalDateTime.of(2026, 3, 5, 10, 0))
                .checkInOpensMinutesBeforeStart(30)
                .build();
        Ticket ticket = Ticket.builder().activityId("activity-1").scope(TicketScope.ACTIVITY).build();

        org.mockito.Mockito.when(activityRepository.findById("activity-1")).thenReturn(java.util.Optional.of(activity));

        assertDoesNotThrow(() -> service.validateTicketLifecycle(ticket, CheckInType.ACTIVITY,
                LocalDateTime.of(2026, 3, 5, 8, 40)));
    }

    @Test
    void runningActivityPastScheduledEndIsStillAllowed() {
        AttendanceService service = new AttendanceService(
                attendanceRepository,
                eventRepository,
                activityRepository,
                userRepository,
                ticketService,
                eventStaffService,
                transactionRunner
        );

        Activity activity = Activity.builder()
                .id("activity-1")
                .status(EventStatus.ONGOING)
                .startDateTime(LocalDateTime.of(2026, 4, 4, 9, 0))
                .endDateTime(LocalDateTime.of(2026, 4, 4, 10, 0))
                .checkInOpensMinutesBeforeStart(15)
                .build();
        Ticket ticket = Ticket.builder().activityId("activity-1").scope(TicketScope.ACTIVITY).build();

        org.mockito.Mockito.when(activityRepository.findById("activity-1")).thenReturn(java.util.Optional.of(activity));

        assertDoesNotThrow(() -> service.validateTicketLifecycle(ticket, CheckInType.ACTIVITY,
                LocalDateTime.of(2026, 4, 4, 10, 15)));
    }

    @Test
    void publishedActivityPastEndWithoutStartingIsRejected() {
        AttendanceService service = new AttendanceService(
                attendanceRepository,
                eventRepository,
                activityRepository,
                userRepository,
                ticketService,
                eventStaffService,
                transactionRunner
        );

        Activity activity = Activity.builder()
                .id("activity-1")
                .status(EventStatus.PUBLISHED)
                .startDateTime(LocalDateTime.of(2026, 5, 1, 9, 0))
                .endDateTime(LocalDateTime.of(2026, 5, 1, 10, 0))
                .checkInOpensMinutesBeforeStart(15)
                .build();
        Ticket ticket = Ticket.builder().activityId("activity-1").scope(TicketScope.ACTIVITY).build();

        org.mockito.Mockito.when(activityRepository.findById("activity-1")).thenReturn(java.util.Optional.of(activity));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                service.validateTicketLifecycle(ticket, CheckInType.ACTIVITY,
                        LocalDateTime.of(2026, 5, 1, 10, 5)));
        assertTrue(ex.getMessage().contains("scheduled end time has passed"));
    }

    @Test
    void completedOrCancelledEventsAndActivitiesAreRejected() {
        AttendanceService service = new AttendanceService(
                attendanceRepository,
                eventRepository,
                activityRepository,
                userRepository,
                ticketService,
                eventStaffService,
                transactionRunner
        );

        Event cancelledEvent = Event.builder().id("event-1").eventStatus(EventStatus.CANCELLED).startDateTime(LocalDateTime.now().plusHours(2)).build();
        Ticket eventTicket = Ticket.builder().eventId("event-1").scope(TicketScope.EVENT).build();
        org.mockito.Mockito.when(eventRepository.findById("event-1")).thenReturn(java.util.Optional.of(cancelledEvent));
        assertThrows(BadRequestException.class, () -> service.validateTicketLifecycle(eventTicket, CheckInType.EVENT_ENTRY, LocalDateTime.now()));

        Activity cancelledActivity = Activity.builder().id("activity-1").status(EventStatus.CANCELLED).startDateTime(LocalDateTime.now().plusHours(1)).endDateTime(LocalDateTime.now().plusHours(2)).build();
        Ticket activityTicket = Ticket.builder().activityId("activity-1").scope(TicketScope.ACTIVITY).build();
        org.mockito.Mockito.when(activityRepository.findById("activity-1")).thenReturn(java.util.Optional.of(cancelledActivity));
        assertThrows(BadRequestException.class, () -> service.validateTicketLifecycle(activityTicket, CheckInType.ACTIVITY, LocalDateTime.now()));
    }

    @Test
    void parentEventCancellationBlocksActivityCheckIn() {
        AttendanceService service = new AttendanceService(
                attendanceRepository,
                eventRepository,
                activityRepository,
                userRepository,
                ticketService,
                eventStaffService,
                transactionRunner
        );

        Activity activity = Activity.builder().id("activity-1").eventId("event-1").status(EventStatus.PUBLISHED).startDateTime(LocalDateTime.now().plusHours(1)).endDateTime(LocalDateTime.now().plusHours(2)).build();
        Event parent = Event.builder().id("event-1").eventStatus(EventStatus.CANCELLED).build();
        Ticket ticket = Ticket.builder().activityId("activity-1").scope(TicketScope.ACTIVITY).build();

        org.mockito.Mockito.when(activityRepository.findById("activity-1")).thenReturn(java.util.Optional.of(activity));
        org.mockito.Mockito.when(eventRepository.findById("event-1")).thenReturn(java.util.Optional.of(parent));

        assertThrows(BadRequestException.class, () -> service.validateTicketLifecycle(ticket, CheckInType.ACTIVITY, LocalDateTime.now()));
    }

    @Test
    void legacyRecordsUseDefaultCheckInWindows() {
        EventValidator eventValidator = new EventValidator();
        ActivityValidator activityValidator = new ActivityValidator();
        CreateEventRequest eventRequest = new CreateEventRequest();
        eventRequest.setStartDateTime(LocalDateTime.now().plusDays(1));
        eventRequest.setEndDateTime(LocalDateTime.now().plusDays(1).plusHours(2));
        eventRequest.setCheckInOpensMinutesBeforeStart(null);
        eventRequest.setVisibility(EventVisibility.OPEN_TO_ALL);

        assertDoesNotThrow(() -> eventValidator.validateEventDate(eventRequest));

        CreateActivityRequest activityRequest = new CreateActivityRequest();
        activityRequest.setRegistrationDeadline(LocalDateTime.now().plusDays(1).minusHours(5));
        activityRequest.setStartDateTime(LocalDateTime.now().plusDays(1));
        activityRequest.setEndDateTime(LocalDateTime.now().plusDays(1).plusHours(1));
        activityRequest.setRegistrationType(RegistrationType.INDIVIDUAL);
        activityRequest.setCapacity(10);
        activityRequest.setCheckInOpensMinutesBeforeStart(null);
        activityRequest.setVisibility(EventVisibility.OPEN_TO_ALL);

        assertDoesNotThrow(() -> activityValidator.validate(activityRequest, null));

        assertEquals(Event.DEFAULT_CHECK_IN_OPENS_MINUTES_BEFORE_START,
                Event.DEFAULT_CHECK_IN_OPENS_MINUTES_BEFORE_START);
        assertEquals(Activity.DEFAULT_CHECK_IN_OPENS_MINUTES_BEFORE_START,
                Activity.DEFAULT_CHECK_IN_OPENS_MINUTES_BEFORE_START);
    }

    @Test
    void invalidCheckInWindowValuesAreRejected() {
        EventValidator eventValidator = new EventValidator();
        ActivityValidator activityValidator = new ActivityValidator();

        CreateEventRequest eventRequest = new CreateEventRequest();
        eventRequest.setStartDateTime(LocalDateTime.now().plusDays(1));
        eventRequest.setEndDateTime(LocalDateTime.now().plusDays(1).plusHours(2));
        eventRequest.setCheckInOpensMinutesBeforeStart(45);
        eventRequest.setVisibility(EventVisibility.OPEN_TO_ALL);

        assertThrows(BadRequestException.class, () -> eventValidator.validateEventDate(eventRequest));

        CreateActivityRequest activityRequest = new CreateActivityRequest();
        activityRequest.setRegistrationDeadline(LocalDateTime.now().plusDays(1).minusHours(1));
        activityRequest.setStartDateTime(LocalDateTime.now().plusDays(1));
        activityRequest.setEndDateTime(LocalDateTime.now().plusDays(1).plusHours(1));
        activityRequest.setRegistrationType(RegistrationType.INDIVIDUAL);
        activityRequest.setCapacity(10);
        activityRequest.setCheckInOpensMinutesBeforeStart(45);
        activityRequest.setVisibility(EventVisibility.OPEN_TO_ALL);

        assertThrows(BadRequestException.class, () -> activityValidator.validate(activityRequest, null));
    }
}
