package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.EventRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.service.EventRegistrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/participant/event-registrations")
@RequiredArgsConstructor
public class EventRegistrationController {

    private final EventRegistrationService eventRegistrationService;

    @PostMapping("/events/{eventId}")
    @ResponseStatus(HttpStatus.CREATED)
    public EventRegistrationResponse register(
            @PathVariable String eventId,
            Authentication authentication
    ) {
        return eventRegistrationService.register(
                eventId,
                authentication.getName()
        );
    }

    @GetMapping("/my")
    public List<EventRegistrationResponse> getMyRegistrations(
            Authentication authentication
    ) {
        return eventRegistrationService.getMyRegistrations(
                authentication.getName()
        );
    }

    @GetMapping("/{registrationId}")
    public EventRegistrationResponse getMyRegistration(
            @PathVariable String registrationId,
            Authentication authentication
    ) {
        return eventRegistrationService.getMyRegistration(
                registrationId,
                authentication.getName()
        );
    }

    @DeleteMapping("/{registrationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(
            @PathVariable String registrationId,
            Authentication authentication
    ) {
        eventRegistrationService.cancel(
                registrationId,
                authentication.getName()
        );
    }
}
