package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.dto.AttendanceResponse;
import com.vansh.eventsphere.eventsphere.event.model.*;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.AttendanceRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EventRepository eventRepository;
    private final ActivityRepository activityRepository;
    private final UserRepository userRepository;
    private final TicketService ticketService;
    private final EventStaffService eventStaffService;
    private final TransactionRunner transactionRunner;

    public AttendanceResponse checkIn(
            String qrPayload,
            CheckInType checkInType,
            String staffUserId
    ) {
        return transactionRunner.run(() -> {
            String ticketId = ticketService.extractTicketId(qrPayload);
            transactionRunner.guard(Ticket.class, ticketId);

            Ticket ticket = ticketService.verifyToken(qrPayload);
            validateTicketScope(ticket, checkInType);
            validateTicketLifecycle(ticket, checkInType);

            if (!eventStaffService.hasCheckInAccess(
                    staffUserId,
                    ticket.getEventId(),
                    ticket.getActivityId(),
                    checkInType
            )) {
                throw new BadRequestException(
                        "You are not assigned to perform this type of check-in."
                );
            }

            Attendance existing = attendanceRepository
                    .findByRegistrationIdAndCheckInType(
                            ticket.getRegistrationId(),
                            checkInType
                    )
                    .orElse(null);

            if (existing != null) {
                AttendanceResponse response = toResponse(existing);
                response.setAlreadyCheckedIn(true);
                return response;
            }

            Attendance saved = attendanceRepository.save(
                    Attendance.builder()
                            .ticketId(ticket.getId())
                            .registrationId(ticket.getRegistrationId())
                            .eventId(ticket.getEventId())
                            .activityId(ticket.getActivityId())
                            .participantId(ticket.getHolderParticipantId())
                            .checkInType(checkInType)
                            .checkedInBy(staffUserId)
                            .checkedInAt(LocalDateTime.now())
                            .build()
            );

            AttendanceResponse response = toResponse(saved);
            response.setAlreadyCheckedIn(false);
            return response;
        });
    }

    public List<AttendanceResponse> getEventAttendance(
            String eventId,
            String organizerId
    ) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found."));

        if (!organizerId.equals(event.getOrganizerId())) {
            throw new BadRequestException(
                    "You are not allowed to view attendance for this event."
            );
        }

        return attendanceRepository.findByEventIdAndCheckInType(
                        eventId,
                        CheckInType.EVENT_ENTRY
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<AttendanceResponse> getActivityAttendance(
            String activityId,
            String organizerId
    ) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found."));

        String ownerId = activity.getOrganizerId();

        if (activity.getEventId() != null) {
            Event event = eventRepository.findById(activity.getEventId())
                    .orElseThrow(() ->
                            new ResourceNotFoundException("Parent event not found.")
                    );
            ownerId = event.getOrganizerId();
        }

        if (!organizerId.equals(ownerId)) {
            throw new BadRequestException(
                    "You are not allowed to view attendance for this activity."
            );
        }

        return attendanceRepository.findByActivityIdAndCheckInType(
                        activityId,
                        CheckInType.ACTIVITY
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void validateTicketScope(
            Ticket ticket,
            CheckInType checkInType
    ) {
        if (checkInType == CheckInType.EVENT_ENTRY) {
            if (ticket.getEventId() == null) {
                throw new BadRequestException(
                        "This ticket cannot be used for event entry."
                );
            }
            return;
        }

        if (ticket.getScope() != TicketScope.ACTIVITY
                || ticket.getActivityId() == null) {
            throw new BadRequestException(
                    "This ticket cannot be used for activity check-in."
            );
        }
    }

    private void validateTicketLifecycle(
            Ticket ticket,
            CheckInType checkInType
    ) {
        if (checkInType == CheckInType.EVENT_ENTRY) {
            Event event = eventRepository.findById(ticket.getEventId())
                    .orElseThrow(() ->
                            new ResourceNotFoundException("Event not found.")
                    );

            if (event.getEventStatus() != EventStatus.PUBLISHED
                    && event.getEventStatus() != EventStatus.ONGOING) {
                throw new BadRequestException(
                        "Event entry check-in is not available right now."
                );
            }
            return;
        }

        Activity activity = activityRepository.findById(ticket.getActivityId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Activity not found.")
                );

        if (activity.getStatus() != EventStatus.ONGOING) {
            throw new BadRequestException(
                    "Activity check-in is available only while the activity is ongoing."
            );
        }
    }

    private AttendanceResponse toResponse(Attendance attendance) {
        Event event = attendance.getEventId() != null
                ? eventRepository.findById(attendance.getEventId()).orElse(null)
                : null;

        Activity activity = attendance.getActivityId() != null
                ? activityRepository.findById(attendance.getActivityId()).orElse(null)
                : null;

        User participant = userRepository.findById(attendance.getParticipantId())
                .orElse(null);

        return AttendanceResponse.builder()
                .attendanceId(attendance.getId())
                .ticketId(attendance.getTicketId())
                .registrationId(attendance.getRegistrationId())
                .eventId(attendance.getEventId())
                .eventName(event != null ? event.getTitle() : null)
                .activityId(attendance.getActivityId())
                .activityName(activity != null ? activity.getName() : null)
                .participantId(attendance.getParticipantId())
                .participantName(participant != null ? participant.getName() : null)
                .checkInType(attendance.getCheckInType())
                .checkedInBy(attendance.getCheckedInBy())
                .checkedInAt(attendance.getCheckedInAt())
                .build();
    }
}
