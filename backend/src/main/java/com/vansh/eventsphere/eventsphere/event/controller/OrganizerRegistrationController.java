package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.OrganizerRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.dto.RejectRegistrationRequest;
import com.vansh.eventsphere.eventsphere.event.service.ActivityRegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/organizer/registrations")
@RequiredArgsConstructor
public class OrganizerRegistrationController {

    private final ActivityRegistrationService activityRegistrationService;

    @PatchMapping("/{registrationId}/approve")
    public OrganizerRegistrationResponse approveRegistration(
            @PathVariable String registrationId,
            Authentication authentication
    ) {
        return activityRegistrationService.approveRegistration(
                registrationId,
                authentication.getName()
        );
    }

    @PatchMapping("/{registrationId}/reject")
    public OrganizerRegistrationResponse rejectRegistration(
            @PathVariable String registrationId,
            @Valid @RequestBody RejectRegistrationRequest request,
            Authentication authentication
    ) {
        return activityRegistrationService.rejectRegistration(
                registrationId,
                authentication.getName(),
                request.getReason()
        );
    }
}