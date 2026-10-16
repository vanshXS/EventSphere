package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.ParticipantActivityResponse;
import com.vansh.eventsphere.eventsphere.event.dto.ParticipantEventResponse;
import com.vansh.eventsphere.eventsphere.event.service.ParticipantEventQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/participant/events")
@RequiredArgsConstructor
public class ParticipantEventController {

    private final ParticipantEventQueryService participantEventQueryService;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<ParticipantEventResponse> getVisibleEvents(
            Authentication authentication
    ) {
        return participantEventQueryService.getVisibleEvents(
                authentication.getName()
        );
    }

    @GetMapping("/activities")
    @ResponseStatus(HttpStatus.OK)
    public List<ParticipantActivityResponse> getVisibleStandaloneActivities(Authentication authentication) {
        return participantEventQueryService.getVisibleStandaloneActivities(authentication.getName());
    }

    @GetMapping("/{eventId}")
    @ResponseStatus(HttpStatus.OK)
    public ParticipantEventResponse getVisibleEvent(
            @PathVariable String eventId,
            Authentication authentication
    ) {
        return participantEventQueryService.getVisibleEvent(
                eventId,
                authentication.getName()
        );
    }

    @GetMapping("/{eventId}/activities")
    @ResponseStatus(HttpStatus.OK)
    public List<ParticipantActivityResponse> getActivities(
            @PathVariable String eventId,
            Authentication authentication
    ) {
        return participantEventQueryService.getActivitiesOfVisibleEvent(
                eventId,
                authentication.getName()
        );
    }
}
