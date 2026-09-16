package com.vansh.eventsphere.eventsphere.event.dto;


import com.vansh.eventsphere.eventsphere.event.model.ActivityType;
import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ActivityResponse {

    private String id;

    private String eventId;

    private String name;

    private String description;

    private ActivityType type;

    private String rules;

    private String location;

    private LocalDateTime startDateTime;

    private LocalDateTime endDateTime;

    private LocalDateTime registrationDeadline;

    private RegistrationType registrationType;

    private Integer capacity;

    private Integer minTeamSize;

    private Integer maxTeamSize;

    private boolean requiresApproval;

    private EventStatus status;

    /**
     * Populated for standalone activities only.
     * Event activities inherit visibility from their Event.
     */
    private EventVisibility visibility;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;


}
