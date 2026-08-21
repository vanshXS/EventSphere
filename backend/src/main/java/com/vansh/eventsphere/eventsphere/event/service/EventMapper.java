package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.event.dto.EventResponse;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Component;

@Component
public class EventMapper {

    public EventResponse mapToResponse(
            @NotNull Event event
            ) {

        return EventResponse.builder()
                .id(event.getId())
                .organizerId(event.getOrganizerId())
                .collegeId(event.getCollegeId())
                .title(event.getTitle())
                .description(event.getDescription())
                .venue(event.getVenue())
                .startDateTime(event.getStartDateTime())
                .endDateTime(event.getEndDateTime())
                .rules(event.getRules())
                .eventVisibility(event.getVisibility())
                .status(event.getEventStatus())
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .build();
    }
}
