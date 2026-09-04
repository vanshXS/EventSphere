package com.vansh.eventsphere.eventsphere.event.service.mappers;

import com.vansh.eventsphere.eventsphere.event.dto.ParticipantActivityResponse;
import com.vansh.eventsphere.eventsphere.event.dto.ParticipantEventResponse;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class ParticipantMapper {

    public ParticipantEventResponse mapToResponse(Event event) {

        return ParticipantEventResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .venue(event.getVenue())
                .rules(event.getRules())
                .startDateTime(event.getStartDateTime())
                .endDateTime(event.getEndDateTime())
                .visibility(event.getVisibility())
                .organizerId(event.getOrganizerId())
                .build();
    }

    /**
     * @param activity    the activity to expose
     * @param parentEvent the owning event, or null for standalone activities
     */
    public ParticipantActivityResponse mapToResponse(
            Activity activity,
            Event parentEvent
    ) {

        boolean standalone = activity.getEventId() == null;

        EventVisibility effectiveVisibility = standalone
                ? activity.getVisibility()
                : (parentEvent != null ? parentEvent.getVisibility() : null);

        return ParticipantActivityResponse.builder()
                .id(activity.getId())
                .eventId(activity.getEventId())
                .name(activity.getName())
                .description(activity.getDescription())
                .activityType(activity.getType())
                .rules(activity.getRules())
                .location(activity.getLocation())
                .startDateTime(activity.getStartDateTime())
                .endDateTime(activity.getEndDateTime())
                .registrationDeadLine(activity.getRegistrationDeadline())
                .registrationType(activity.getRegistrationType())
                .capacity(activity.getCapacity())
                .minTeamSize(activity.getMinTeamSize())
                .maxTeamSize(activity.getMaxTeamSize())
                .visibility(effectiveVisibility)
                .standalone(standalone)
                .registrationOpen(isRegistrationOpen(activity))
                .build();
    }

    /**
     * Deadline-only check. Capacity is intentionally NOT considered here:
     * slot availability is enforced atomically at registration time and
     * would be stale by the time this response reaches the client.
     */
    private boolean isRegistrationOpen(Activity activity) {

        LocalDateTime deadline = activity.getRegistrationDeadline();

        return deadline != null
                && LocalDateTime.now().isBefore(deadline);
    }
}