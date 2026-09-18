package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.AcceptStaffInvitationRequest;
import com.vansh.eventsphere.eventsphere.event.dto.EventStaffAssignmentResponse;
import com.vansh.eventsphere.eventsphere.event.service.EventStaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff/invitations")
@RequiredArgsConstructor
public class StaffInvitationController {

    private final EventStaffService eventStaffService;

    @GetMapping("/{token}")
    public EventStaffAssignmentResponse getInvitation(
            @PathVariable String token
    ) {
        return eventStaffService.getInvitation(token);
    }

    @PostMapping("/{token}/accept")
    public EventStaffAssignmentResponse acceptInvitation(
            @PathVariable String token,
            @RequestBody(required = false) AcceptStaffInvitationRequest request
    ) {
        if (request == null) {
            request = new AcceptStaffInvitationRequest();
        }

        return eventStaffService.acceptInvitation(token, request);
    }
}
