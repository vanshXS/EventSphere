package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.EventStaffAssignmentResponse;
import com.vansh.eventsphere.eventsphere.event.service.EventStaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/volunteer")
@RequiredArgsConstructor
public class VolunteerController {

    private final EventStaffService eventStaffService;

    @GetMapping("/assignments")
    public List<EventStaffAssignmentResponse> getMyAssignments(
            Authentication authentication
    ) {
        return eventStaffService.getMyAssignments(authentication.getName());
    }
}
