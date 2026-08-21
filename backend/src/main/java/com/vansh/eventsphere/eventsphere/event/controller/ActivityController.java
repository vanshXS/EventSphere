package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.ActivityResponse;
import com.vansh.eventsphere.eventsphere.event.dto.CreateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.service.ActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizer/events")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @PostMapping("/{eventId}/activities")
    @ResponseStatus(HttpStatus.CREATED)
    public ActivityResponse createActivity(
            @PathVariable String eventId,
            @Valid @RequestBody CreateActivityRequest request,
            Authentication authentication
    ){
        return activityService.createActivity(request, eventId, authentication.getName());
    }

    @GetMapping("/{eventId}/activities")
    public List<ActivityResponse> getActivitiesByEvent(
            @PathVariable String eventId,
            Authentication authentication
    ){
        return activityService.getActivitiesByEvent(eventId, authentication.getName());
    }
}
