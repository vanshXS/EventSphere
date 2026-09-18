package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.event.dto.CreateEventRequest;
import com.vansh.eventsphere.eventsphere.event.dto.EventResponse;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.event.service.mappers.EventMapper;
import com.vansh.eventsphere.eventsphere.event.service.validators.EventValidator;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final EventRepository eventRepository;
    private final EventValidator eventValidator;
    private final EventMapper eventMapper;
    private final UserRepository userRepository;


    public EventResponse createEvent(
            CreateEventRequest request,
            String userId
    ) {

        log.info("Create event request by userId: {}", userId);

        User currentUser = userRepository.findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        eventValidator.validateEventDate(request);

        LocalDateTime createdAt = LocalDateTime.now();

        Event event = Event.builder()
                .organizerId(currentUser.getUserId())
                .collegeId(currentUser.getCollegeId())
                .title(request.getTitle())
                .description(request.getDescription())
                .venue(request.getVenue())
                .startDateTime(request.getStartDateTime())
                .endDateTime(request.getEndDateTime())
                .visibility(request.getVisibility())
                .createdAt(createdAt)
                .updatedAt(createdAt)
                .eventStatus(EventStatus.DRAFT)
                .build();

        Event savedEvent = eventRepository.save(event);
        log.info("Created event: {}", savedEvent);

        return eventMapper.mapToResponse(savedEvent);

    }

    public List<EventResponse> getMyEvents(String organizerId) {

        return eventRepository.findByOrganizerId(organizerId)
                .stream()
                .sorted(Comparator.comparing(Event::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Event::getStartDateTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(eventMapper::mapToResponse)
                .toList();
    }

    public EventResponse getEventById(
            String eventId,
            String organizerId
    ) {
        log.info("Get event by eventId: {}", eventId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if(!event.getOrganizerId().equals(organizerId)) {
            throw new RuntimeException(
                    "You are not allowed to access this event"
            );
        }

        return eventMapper.mapToResponse(event);

    }

    public EventResponse updateEvent(
            CreateEventRequest request,
            String eventID,
            String organizerId
    ) {

        log.info("Update event request by userId: {}", eventID);
        Event existedEvent = eventRepository.findById(eventID)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        eventValidator.validateEventAccess(existedEvent, organizerId);

        eventValidator.validateEventDate(request);

        existedEvent.setTitle(request.getTitle());
        existedEvent.setDescription(request.getDescription());

        existedEvent.setVenue(request.getVenue());
        existedEvent.setStartDateTime(request.getStartDateTime());
        existedEvent.setEndDateTime(request.getEndDateTime());
        existedEvent.setVisibility(request.getVisibility());
        existedEvent.setUpdatedAt(LocalDateTime.now());


        Event updatedEvent = eventRepository.save(existedEvent);

        log.info("Updated event: {}", updatedEvent);
        return eventMapper.mapToResponse(updatedEvent);
    }

    public void deleteEvent(
            String eventId,
            String organizerId
    ) {

        log.info("Delete event by eventId: {}", eventId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        eventValidator.validateDeleteEvent(event);
        eventRepository.delete(event);
    }

    public EventResponse publishEvent(
            String eventId,
            String organizerId
    ) {

        log.info("Publish event by eventId: {}", eventId);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        eventValidator.validateEventAccess(event, organizerId);
        eventValidator.validateCanPublish(event);

        event.setEventStatus(EventStatus.PUBLISHED);
        event.setUpdatedAt(LocalDateTime.now());
        Event publishedEvent = eventRepository.save(event);
        log.info("Published event: {}", publishedEvent);

        return eventMapper.mapToResponse(publishedEvent);
    }
}
