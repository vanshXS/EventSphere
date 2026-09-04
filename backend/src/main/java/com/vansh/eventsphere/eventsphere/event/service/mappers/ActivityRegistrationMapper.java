package com.vansh.eventsphere.eventsphere.event.service.mappers;


import com.vansh.eventsphere.eventsphere.event.dto.ActivityRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import org.springframework.stereotype.Component;

@Component
public class ActivityRegistrationMapper {

    public ActivityRegistrationResponse mapToResponse(
            ActivityRegistration registration
    ) {
        return
                ActivityRegistrationResponse.builder()
                        .id(registration.getId())
                        .activityId(registration.getActivityId())
                        .eventId(registration.getEventId())
                        .participantId(registration.getParticipantId())
                        .registrationType(registration.getRegistrationType())
                        .teamId(registration.getTeamId())
                        .status(registration.getStatus())
                        .registeredAt(registration.getRegisteredAt())
                        .build();
    }
}
