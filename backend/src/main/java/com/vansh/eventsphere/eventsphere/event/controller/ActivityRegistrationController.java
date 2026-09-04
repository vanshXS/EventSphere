package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.ActivityRegistrationRequest;
import com.vansh.eventsphere.eventsphere.event.dto.ActivityRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.service.ActivityRegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/participant")
@RequiredArgsConstructor
public class ActivityRegistrationController {

    private final ActivityRegistrationService activityRegistrationService;

    @PostMapping({"/activities/{activityId}/registration", "/activities/{activityId}/registrations", "/registrations/activities/{activityId}"})
    @ResponseStatus(HttpStatus.CREATED)
    public ActivityRegistrationResponse register(
            @PathVariable String activityId,
            @Valid @RequestBody ActivityRegistrationRequest request,
            Authentication authentication
    ) {
        String participantId = authentication.getName();
        return activityRegistrationService.register(activityId, participantId, request);
    }

    @GetMapping("/registrations/me")
    @ResponseStatus(HttpStatus.OK)
    public List<ActivityRegistrationResponse> getMyRegistrations(
            Authentication authentication
    ) {
        String participantId = authentication.getName();
        return activityRegistrationService.getMyRegistrations(participantId);
    }

    @DeleteMapping("/registrations/{registrationId}")
    @ResponseStatus(HttpStatus.OK)
    public ActivityRegistrationResponse cancelRegistration(
            @PathVariable String registrationId,
            Authentication authentication
    ) {
        String participantId = authentication.getName();
        return activityRegistrationService.cancelRegistration(registrationId, participantId);
    }
}
