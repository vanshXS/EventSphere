package com.vansh.eventsphere.eventsphere.event.dto;

import java.time.LocalDateTime;

import com.vansh.eventsphere.eventsphere.event.model.ActivityType;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
    private long activityCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
