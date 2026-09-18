package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.dto.EventRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.EventRegistration;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventRegistrationService {

    private static final List<RegistrationStatus> ACTIVE_STATUSES = List.of(
            RegistrationStatus.PENDING,
            RegistrationStatus.APPROVED,
            RegistrationStatus.REGISTERED
    );

    private final EventRegistrationRepository eventRegistrationRepository;
    private final EventRepository eventRepository;
    private final ActivityRepository activityRepository;
    private final UserRepository userRepository;
    private final VisibilityService visibilityService;
    private final TransactionRunner transactionRunner;
    private final TicketService ticketService;
    private final MongoTemplate mongoTemplate;

    public EventRegistrationResponse register(String eventId, String participantId) {
        return transactionRunner.run(() -> {
            transactionRunner.guard(Event.class, eventId);

            User participant = userRepository.findById(participantId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));

            Event event = getEvent(eventId);

            if (!activityRepository.findByEventId(eventId).isEmpty()) {
                throw new BadRequestException(
                        "This event has activities. Register through an activity instead."
                );
            }

            if (!visibilityService.canViewEvent(event, participant)) {
                throw new BadRequestException("You are not allowed to register for this event.");
            }

            if (event.getEventStatus() != EventStatus.PUBLISHED
                    && event.getEventStatus() != EventStatus.ONGOING) {
                throw new BadRequestException(
                        "Registration is not available for this event."
                );
            }

            if (eventRegistrationRepository
                    .existsByEventIdAndParticipantIdAndStatusIn(
                            eventId,
                            participantId,
                            ACTIVE_STATUSES
                    )) {
                throw new BadRequestException(
                        "You are already registered for this event."
                );
            }

            EventRegistration saved = eventRegistrationRepository.save(
                    EventRegistration.builder()
                            .eventId(eventId)
                            .participantId(participantId)
                            .status(RegistrationStatus.APPROVED)
                            .registeredAt(LocalDateTime.now())
                            .build()
            );

            EventRegistrationResponse response = toResponse(saved);
            response.setTicket(ticketService.issueForEventRegistration(saved, participantId));
            return response;
        });
    }

    public List<EventRegistrationResponse> getMyRegistrations(String participantId) {
        return eventRegistrationRepository.findByParticipantId(participantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public EventRegistrationResponse getMyRegistration(
            String registrationId,
            String participantId
    ) {
        EventRegistration registration = eventRegistrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Event registration not found."));

        if (!participantId.equals(registration.getParticipantId())) {
            throw new BadRequestException("You can only access your own event registration.");
        }

        return toResponse(registration);
    }

    public EventRegistrationResponse cancel(
            String registrationId,
            String participantId
    ) {
        EventRegistration registration = eventRegistrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Event registration not found."));

        if (!participantId.equals(registration.getParticipantId())) {
            throw new BadRequestException("You can only cancel your own event registration.");
        }

        if (!ACTIVE_STATUSES.contains(registration.getStatus())) {
            throw new BadRequestException("This event registration can no longer be cancelled.");
        }

        Query query = Query.query(
                Criteria.where("id").is(registrationId)
                        .and("participantId").is(participantId)
                        .and("status").in(ACTIVE_STATUSES)
        );

        EventRegistration updated = mongoTemplate.findAndModify(
                query,
                new Update()
                        .set("status", RegistrationStatus.CANCELLED)
                        .set("cancelledAt", LocalDateTime.now()),
                FindAndModifyOptions.options().returnNew(true),
                EventRegistration.class
        );

        if (updated == null) {
            throw new BadRequestException(
                    "This event registration changed while you were cancelling it. Refresh and try again."
            );
        }

        ticketService.revokeByRegistrationId(registrationId);
        return toResponse(updated);
    }

    public List<EventRegistrationResponse> getRegistrationsForEvent(
            String eventId,
            String organizerId
    ) {
        Event event = getEvent(eventId);

        if (!organizerId.equals(event.getOrganizerId())) {
            throw new BadRequestException(
                    "You are not allowed to view registrations for this event."
            );
        }

        return eventRegistrationRepository.findByEventId(eventId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private EventRegistrationResponse toResponse(EventRegistration registration) {
        Event event = eventRepository.findById(registration.getEventId()).orElse(null);

        EventRegistrationResponse response = EventRegistrationResponse.builder()
                .id(registration.getId())
                .eventId(registration.getEventId())
                .eventName(event != null ? event.getTitle() : null)
                .participantId(registration.getParticipantId())
                .status(registration.getStatus())
                .registeredAt(registration.getRegisteredAt())
                .cancelledAt(registration.getCancelledAt())
                .build();

        if (registration.getStatus() == RegistrationStatus.APPROVED
                || registration.getStatus() == RegistrationStatus.REGISTERED) {
            response.setTicket(
                    ticketService.getOrIssueEventTicket(
                            registration.getId(),
                            registration.getParticipantId()
                    )
            );
        }

        return response;
    }

    private Event getEvent(String eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found."));
    }
}
