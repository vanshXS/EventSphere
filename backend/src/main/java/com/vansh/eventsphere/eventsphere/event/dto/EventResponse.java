package com.vansh.eventsphere.eventsphere.event.dto;

import com.vansh.eventsphere.eventsphere.event.model.ActivityType;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor @AllArgsConstructor
public class EventResponse {

    private String id;
    private String organizerId;
    private String collegeId;
    private String title;
    private String description;
    private ActivityType category;
    private String venue;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;

    private LocalDateTime registrationDeadLine;

    private String rules;
    private RegistrationType registrationType;
    private EventVisibility eventVisibility;
    private EventStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
