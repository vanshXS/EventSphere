package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.dto.AttendanceResponse;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.Attendance;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.event.model.Ticket;
import com.vansh.eventsphere.eventsphere.event.model.TicketScope;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.AttendanceRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
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

    public AttendanceResponse checkIn(String qrPayload, String staffUserId) {
        return transactionRunner.run(() -> {
            String ticketId = ticketService.extractTicketId(qrPayload);
            transactionRunner.guard(Ticket.class, ticketId);

            Ticket ticket = ticketService.verifyToken(qrPayload);
            validateTicketLifecycle(ticket);

            if (!eventStaffService.hasCheckInAccess(
                    staffUserId,
                    ticket.getEventId(),
                    ticket.getActivityId(),
                    ticket.getScope()
            )) {
                throw new BadRequestException(
                        "You are not assigned to check in this ticket."
                );
            }

            Attendance existing = attendanceRepository
                    .findByRegistrationId(ticket.getRegistrationId())
                    .orElse(null);

            if (existing != null) {
                AttendanceResponse response = toResponse(existing);
                response.setAlreadyCheckedIn(true);
                return response;
            }

            Attendance attendance = Attendance.builder()
                    .ticketId(ticket.getId())
                    .registrationId(ticket.getRegistrationId())
                    .eventId(ticket.getEventId())
                    .activityId(ticket.getActivityId())
                    .participantId(ticket.getParticipantId())
                    .checkedInBy(staffUserId)
                    .checkedInAt(LocalDateTime.now())
                    .build();

            try {
                Attendance saved = attendanceRepository.save(attendance);

                AttendanceResponse response = toResponse(saved);
                response.setAlreadyCheckedIn(false);
                return response;
            } catch (DuplicateKeyException exception) {
                Attendance duplicate = attendanceRepository
                        .findByRegistrationId(ticket.getRegistrationId())
                        .orElseThrow(() -> exception);

                AttendanceResponse response = toResponse(duplicate);
                response.setAlreadyCheckedIn(true);
                return response;
            }
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

        return attendanceRepository.findByEventId(eventId)
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
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Parent event not found."
                    ));
            ownerId = event.getOrganizerId();
        }

        if (!organizerId.equals(ownerId)) {
            throw new BadRequestException(
                    "You are not allowed to view attendance for this activity."
            );
        }

        return attendanceRepository.findByActivityId(activityId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void validateTicketLifecycle(Ticket ticket) {
        if (ticket.getScope() == TicketScope.EVENT) {
            Event event = eventRepository.findById(ticket.getEventId())
                    .orElseThrow(() -> new ResourceNotFoundException("Event not found."));

            if (event.getEventStatus() != EventStatus.PUBLISHED
                    && event.getEventStatus() != EventStatus.ONGOING) {
                throw new BadRequestException(
                        "Check-in is not available for this event."
                );
            }
            return;
        }

        Activity activity = activityRepository.findById(ticket.getActivityId())
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found."));

        if (activity.getEventId() != null) {
            Event event = eventRepository.findById(activity.getEventId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Parent event not found."
                    ));

            if (event.getEventStatus() != EventStatus.PUBLISHED
                    && event.getEventStatus() != EventStatus.ONGOING) {
                throw new BadRequestException(
                        "Check-in is not available for this activity."
                );
            }
            return;
        }

        if (activity.getStatus() != EventStatus.PUBLISHED
                && activity.getStatus() != EventStatus.ONGOING) {
            throw new BadRequestException(
                    "Check-in is not available for this activity."
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
                .checkedInBy(attendance.getCheckedInBy())
                .checkedInAt(attendance.getCheckedInAt())
                .build();
    }
}
