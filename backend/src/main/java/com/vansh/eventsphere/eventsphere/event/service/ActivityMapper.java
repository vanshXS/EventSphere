package com.vansh.eventsphere.eventsphere.event.service;

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
                .location(activity.getLocation())
                .startDateTime(activity.getStartDateTime())
                .endDateTime(activity.getEndDateTime())
                .registrationDeadline(activity.getRegistrationDeadline())
                .registrationType(activity.getRegistrationType())
                .capacity(activity.getCapacity())
                .minTeamSize(activity.getMinTeamSize())
                .maxTeamSize(activity.getMaxTeamSize())
                .build();
    }
}
