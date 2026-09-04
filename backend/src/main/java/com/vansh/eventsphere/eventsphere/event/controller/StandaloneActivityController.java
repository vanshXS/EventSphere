package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.ActivityResponse;
import com.vansh.eventsphere.eventsphere.event.dto.CreateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.dto.OrganizerRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.dto.UpdateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.service.ActivityRegistrationService;
import com.vansh.eventsphere.eventsphere.event.service.ActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/organizer/activities")
@RequiredArgsConstructor
public class StandaloneActivityController {
    private final ActivityService activityService;
    private final ActivityRegistrationService activityRegistrationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ActivityResponse create(@Valid @RequestBody CreateActivityRequest request, Authentication authentication) {
        return activityService.createStandaloneActivity(request, authentication.getName());
    }

    @GetMapping
    public List<ActivityResponse> list(Authentication authentication) {
        return activityService.getStandaloneActivities(authentication.getName());
    }

    @GetMapping("/{activityId}")
    public ActivityResponse get(@PathVariable String activityId, Authentication authentication) {
        return activityService.getActivity(activityId, authentication.getName());
    }

    @PatchMapping("/{activityId}/publish")
    public ActivityResponse publish(@PathVariable String activityId, Authentication authentication) {
        return activityService.publishStandaloneActivity(activityId, authentication.getName());
    }

    @GetMapping("/{activityId}/registrations")
    @ResponseStatus(HttpStatus.OK)
    public List<OrganizerRegistrationResponse> getRegistrations(@PathVariable String activityId, Authentication authentication) {
        return activityRegistrationService.getRegistrationsForActivity(activityId, authentication.getName());
    }

    @PutMapping("/{activityId}")
    public ActivityResponse update(@PathVariable String activityId, @Valid @RequestBody UpdateActivityRequest request,
                                   Authentication authentication) {
        return activityService.updateActivity(activityId, request, authentication.getName());
    }

    @DeleteMapping("/{activityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String activityId, Authentication authentication) {
        activityService.deleteActivity(activityId, authentication.getName());
    }
}
