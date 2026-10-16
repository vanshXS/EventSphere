package com.vansh.eventsphere.eventsphere.event.service.mappers;

import com.vansh.eventsphere.eventsphere.event.dto.ActivityResponse;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import org.springframework.stereotype.Component;

@Component
public class ActivityMapper {

    public ActivityResponse mapToResponse(Activity activity){
        EventStatus status = activity.getStatus();
        if (status == null && activity.getEventId() != null) {
            if (activity.getActualEndDateTime() != null) {
                status = EventStatus.COMPLETED;
            } else if (activity.getActualStartDateTime() != null) {
                status = EventStatus.ONGOING;
            } else {
                status = EventStatus.PUBLISHED;
            }
        }

        return ActivityResponse.builder()
                .id(activity.getId())
                .eventId(activity.getEventId())
                .name(activity.getName())
                .description(activity.getDescription())
                .type(activity.getType())
                .rules(activity.getRules())
                .requiresApproval(activity.isRequiresApproval())
                .location(activity.getLocation())
                .startDateTime(activity.getStartDateTime())
                .endDateTime(activity.getEndDateTime())
                .actualStartDateTime(activity.getActualStartDateTime())
                .actualEndDateTime(activity.getActualEndDateTime())
                .registrationDeadline(activity.getRegistrationDeadline())
                .registrationType(activity.getRegistrationType())
                .capacity(activity.getCapacity())
                .minTeamSize(activity.getMinTeamSize())
                .maxTeamSize(activity.getMaxTeamSize())
                .status(status)
                .visibility(activity.getVisibility())
                .createdAt(activity.getCreatedAt())
                .updatedAt(activity.getUpdatedAt())
                .build();
    }
}
