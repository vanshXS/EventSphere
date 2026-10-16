package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.EventStaffAssignmentResponse;
import com.vansh.eventsphere.eventsphere.event.dto.InviteStaffRequest;
import com.vansh.eventsphere.eventsphere.event.service.EventStaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizer")
@RequiredArgsConstructor
public class EventStaffController {

    private final EventStaffService eventStaffService;

    @PostMapping("/events/{eventId}/staff")
    public EventStaffAssignmentResponse inviteToEvent(
            @PathVariable String eventId,
            @Valid @RequestBody InviteStaffRequest request,
            Authentication authentication
    ) {
        return eventStaffService.inviteToEvent(
                eventId,
                request,
                authentication.getName()
        );
    }

    @GetMapping("/events/{eventId}/staff")
    public List<EventStaffAssignmentResponse> getEventStaff(
            @PathVariable String eventId,
            Authentication authentication
    ) {
        return eventStaffService.getEventStaff(
                eventId,
                authentication.getName()
        );
    }

    @PostMapping("/activities/{activityId}/staff")
    public EventStaffAssignmentResponse inviteToActivity(
            @PathVariable String activityId,
            @Valid @RequestBody InviteStaffRequest request,
            Authentication authentication
    ) {
        return eventStaffService.inviteToActivity(
                activityId,
                request,
                authentication.getName()
        );
    }

    @GetMapping("/activities/{activityId}/staff")
    public List<EventStaffAssignmentResponse> getActivityStaff(
            @PathVariable String activityId,
            Authentication authentication
    ) {
        return eventStaffService.getActivityStaff(
                activityId,
                authentication.getName()
        );
    }

    @PatchMapping("/staff/{assignmentId}/revoke")
    public void revoke(
            @PathVariable String assignmentId,
            Authentication authentication
    ) {
        eventStaffService.revoke(
                assignmentId,
                authentication.getName()
        );
    }
}
