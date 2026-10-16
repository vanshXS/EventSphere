package com.vansh.eventsphere.eventsphere.event.dto;

import java.time.LocalDateTime;

import com.vansh.eventsphere.eventsphere.event.model.ActivityType;
import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ParticipantActivityResponse {

    private String id;
    private String eventId;
    private String name;
    private String description;
    private ActivityType activityType;
    private String rules;
    private RegistrationType registrationType;
    private LocalDateTime registrationDeadLine;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private String location;
    private Integer capacity;
    private Integer minTeamSize;
    private Integer maxTeamSize;
    private EventVisibility visibility;
    private boolean registrationOpen;
    private boolean standalone;
}
