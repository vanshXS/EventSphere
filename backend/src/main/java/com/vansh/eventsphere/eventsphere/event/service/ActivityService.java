package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.event.dto.ActivityResponse;
import com.vansh.eventsphere.eventsphere.event.dto.CreateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import java.util.List;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivityValidator activityValidator;
    private final EventRepository eventRepository;
    private final ActivityMapper activityMapper;

    public ActivityResponse createActivity(
            CreateActivityRequest request,
            String eventId,
            String organizerId
    ){

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if(!event.getOrganizerId().equals(organizerId)){
            throw new IllegalArgumentException("You are not allowed to modify this event.");
        }
        activityValidator.validate(request, event);

        Activity newActivity = Activity.builder()
                .eventId(eventId)
                .name(request.getName())
                .description(request.getDescription())
                .type(request.getType())
                .rules(request.getRules())
                .location(request.getLocation())
                .startDateTime(request.getStartDateTime())
                .endDateTime(request.getEndDateTime())
                .registrationDeadline(request.getRegistrationDeadline())
                .registrationType(request.getRegistrationType())
                .capacity(request.getCapacity())
                .minTeamSize(request.getMinTeamSize())
                .maxTeamSize(request.getMaxTeamSize())
                .build();

        Activity savedActivity = activityRepository.save(newActivity);

        return activityMapper.mapToResponse(savedActivity);
    }

    public List<ActivityResponse> getActivitiesByEvent(String eventId, String organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if (!event.getOrganizerId().equals(organizerId)) {
            throw new IllegalArgumentException("You are not allowed to access this event.");
        }

        List<Activity> activities = activityRepository.findByEventId(eventId);
        return activities.stream()
                .map(activityMapper::mapToResponse)
                .toList();
    }
}
