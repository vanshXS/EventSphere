package com.vansh.eventsphere.eventsphere.event.service;


import com.vansh.eventsphere.eventsphere.event.dto.ParticipantActivityResponse;
import com.vansh.eventsphere.eventsphere.event.dto.ParticipantEventResponse;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.event.service.mappers.ParticipantMapper;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ParticipantEventQueryService {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final VisibilityService visibilityService;
    private final ParticipantMapper participantMapper;
    private final ActivityRepository activityRepository;

    public List<EventStatus> BROWSABLE_STATUSES =
            List.of(EventStatus.PUBLISHED, EventStatus.ONGOING);

    public List<ParticipantEventResponse> getVisibleEvents(String userId) {

        User participant = getParticipant(userId);

        List<Event> events =
                eventRepository.findByEventStatusIn(BROWSABLE_STATUSES);

        List<ParticipantEventResponse> visible = events.stream()
                .filter(event -> visibilityService.canViewEvent(event, participant))
                .sorted(Comparator.comparing(Event::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Event::getStartDateTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(participantMapper::mapToResponse)
                .toList();

        log.info(
                "Participant {} can view {} of {} browsable event(s)",
                userId,
                visible.size(),
                events.size()
        );
        return visible;
    }

    public ParticipantEventResponse getVisibleEvent(
            String eventId,
            String userId
    ) {
        return participantMapper.mapToResponse(loadVisibleEvent(eventId, userId));
    }

    public List<ParticipantActivityResponse> getActivitiesOfVisibleEvent(
            String eventId,
            String userId
    ) {
        Event event = loadVisibleEvent(eventId, userId);

        return activityRepository.findByEventId(event.getId())
                .stream()
                .sorted(Comparator.comparing(Activity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Activity::getStartDateTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(activity -> participantMapper.mapToResponse(activity, event))
                .toList();
    }

    public List<ParticipantActivityResponse> getVisibleStandaloneActivities(String userId) {
        User participant = getParticipant(userId);
        return activityRepository.findByEventIdIsNullAndStatusIn(BROWSABLE_STATUSES).stream()
                .filter(activity -> userRepository.findById(activity.getOrganizerId())
                        .map(organizer -> visibilityService.canViewStandAloneActivity(activity, organizer, participant))
                        .orElse(false))
                .sorted(Comparator.comparing(Activity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Activity::getStartDateTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(activity -> participantMapper.mapToResponse(activity, null))
                .toList();
    }


    //Helper functions
    private User getParticipant(String userId) {

        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found!"));
    }

    /**
     * Loads an event a participant is allowed to see.
     *
     * A hidden or non-browsable event is reported as NOT FOUND
     * rather than
     * FORBIDDEN, so that participants cannot probe for the existence of
     * events belonging to other colleges
     */

    private Event loadVisibleEvent(
            String eventId,
            String userId
    ) {
        User participant = getParticipant(userId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found!"));

        if(!BROWSABLE_STATUSES.contains(event.getEventStatus()) || !visibilityService.canViewEvent(event, participant)) {
            log.debug(
                    "Event {} is not visible to participant {}",
                    eventId, userId
            );
            throw new ResourceNotFoundException("Event not found");
        }
        return event;

    }
}
