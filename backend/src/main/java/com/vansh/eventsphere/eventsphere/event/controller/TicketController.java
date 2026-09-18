package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.TicketResponse;
import com.vansh.eventsphere.eventsphere.event.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/participant/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @GetMapping("/event-registrations/{registrationId}")
    public TicketResponse getEventTicket(
            @PathVariable String registrationId,
            Authentication authentication
    ) {
        return ticketService.getOrIssueEventTicket(
                registrationId,
                authentication.getName()
        );
    }

    @GetMapping("/activity-registrations/{registrationId}")
    public TicketResponse getActivityTicket(
            @PathVariable String registrationId,
            Authentication authentication
    ) {
        return ticketService.getOrIssueActivityTicket(
                registrationId,
                authentication.getName()
        );
    }
}
