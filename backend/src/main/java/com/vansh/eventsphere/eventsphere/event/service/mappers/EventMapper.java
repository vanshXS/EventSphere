package com.vansh.eventsphere.eventsphere.event.service.mappers;

import org.springframework.stereotype.Component;

import com.vansh.eventsphere.eventsphere.event.dto.EventResponse;
import com.vansh.eventsphere.eventsphere.event.model.Event;

import jakarta.validation.constraints.NotNull;

@Component
public class EventMapper {

    public EventResponse mapToResponse(
            @NotNull Event event) {
        return mapToResponse(event, 0);
    }

    public EventResponse mapToResponse(
            @NotNull Event event, long activityCount) {

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
                .activityCount(activityCount)
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .build();
    }
}
