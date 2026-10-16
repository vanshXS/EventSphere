package com.vansh.eventsphere.eventsphere.event.dto;

import java.time.LocalDateTime;

import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ParticipantEventResponse {

    private String id;
    private String title;
    private String description;
    private String venue;
    private String rules;
    private EventVisibility visibility;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private String organizerId;

}
