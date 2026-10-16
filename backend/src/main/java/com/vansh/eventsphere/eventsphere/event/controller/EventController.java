package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.CreateEventRequest;
import com.vansh.eventsphere.eventsphere.event.dto.EventResponse;
import com.vansh.eventsphere.eventsphere.event.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/organizer/events")
public class EventController {

    private final EventService eventService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventResponse createEvent(
            @RequestBody @Validated CreateEventRequest request,
            Authentication authentication //it returns authentication object contains the details which we set up in the jwtAuthentication class
            ) {
        return eventService.createEvent(
                request,
                authentication.getName()); //authentication.getName() actually returns the userId, not email.
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<EventResponse> findAllEvents(
            Authentication authentication
    ) {
        return eventService.getMyEvents(
                authentication.getName());
    }

    @GetMapping("/{eventId}")
    @ResponseStatus(HttpStatus.OK)
    public EventResponse findEventById(
            @PathVariable String eventId,
            Authentication authentication
    ){
        return eventService.getEventById(
                eventId,
                authentication.getName());
    }

    @PutMapping("/{eventId}")
    @ResponseStatus(HttpStatus.OK)
    public EventResponse updateEvent(
            @PathVariable String eventId,
            @Valid @RequestBody CreateEventRequest request,
            Authentication authentication
    ){
        return eventService.updateEvent(
                request,
                eventId,
                authentication.getName()
        );
    }

    @DeleteMapping("/{eventId}")
    @ResponseStatus(HttpStatus.OK)
    public void deleteEvent(
            @PathVariable String eventId,
            Authentication authentication
    ){
        eventService.deleteEvent(
                eventId,
                authentication.getName()
        );
    }

    @PatchMapping("/{eventId}/publish")
    @ResponseStatus(HttpStatus.OK)
    public EventResponse publishEvent(
            @PathVariable String eventId,
            Authentication authentication
    ){
        return eventService.publishEvent(eventId, authentication.getName());
    }
}
