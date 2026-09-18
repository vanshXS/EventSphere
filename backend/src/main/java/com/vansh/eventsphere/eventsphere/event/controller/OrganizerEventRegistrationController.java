package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.EventRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.service.EventRegistrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizer/events")
@RequiredArgsConstructor
public class OrganizerEventRegistrationController {

    private final EventRegistrationService eventRegistrationService;

    @GetMapping("/{eventId}/registrations")
    public List<EventRegistrationResponse> getRegistrationsForEvent(
            @PathVariable String eventId,
            Authentication authentication
    ) {
        return eventRegistrationService.getRegistrationsForEvent(
                eventId,
                authentication.getName()
        );
    }
}
