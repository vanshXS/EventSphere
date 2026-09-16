package com.vansh.eventsphere.eventsphere.event.service.mappers;

import com.vansh.eventsphere.eventsphere.event.dto.ActivityResponse;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import org.springframework.stereotype.Component;

@Component
public class ActivityMapper {

    public ActivityResponse mapToResponse(Activity activity){

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
                .registrationDeadline(activity.getRegistrationDeadline())
                .registrationType(activity.getRegistrationType())
                .capacity(activity.getCapacity())
                .minTeamSize(activity.getMinTeamSize())
                .maxTeamSize(activity.getMaxTeamSize())
                .status(activity.getStatus())
                .visibility(activity.getVisibility())
                .createdAt(activity.getCreatedAt())
                .updatedAt(activity.getUpdatedAt())
                .build();
    }
}
