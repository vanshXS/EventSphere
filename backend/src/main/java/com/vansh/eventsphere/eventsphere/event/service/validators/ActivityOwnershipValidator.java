
package com.vansh.eventsphere.eventsphere.event.service.validators;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ActivityOwnershipValidator {

    private final ActivityRepository activityRepository;
    private final EventRepository eventRepository;

    public Activity getAndValidateOwnedActivity(
            String activityId,
            String organizerId) {

        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Activity not found."));

        String actualOwnerId;

        if (activity.getEventId() != null) {
            Event event = eventRepository.findById(activity.getEventId())
                    .orElseThrow(() ->
                            new ResourceNotFoundException(
                                    "Parent event not found."));

            actualOwnerId = event.getOrganizerId();
        } else {
            actualOwnerId = activity.getOrganizerId();
        }

        if (organizerId == null || !organizerId.equals(actualOwnerId)) {
            throw new AccessDeniedException(
                    "You are not allowed to manage this activity.");
        }

        return activity;
    }
}
