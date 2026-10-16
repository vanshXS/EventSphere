package com.vansh.eventsphere.eventsphere.event.controller;

import com.vansh.eventsphere.eventsphere.event.dto.ActivityResponse;
import com.vansh.eventsphere.eventsphere.event.dto.ActivitySummaryResponse;
import com.vansh.eventsphere.eventsphere.event.dto.CreateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.dto.OrganizerRegistrationResponse;
import com.vansh.eventsphere.eventsphere.event.dto.UpdateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.service.ActivityRegistrationService;
import com.vansh.eventsphere.eventsphere.event.service.ActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizer/events")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;
    private final ActivityRegistrationService activityRegistrationService;

    @PostMapping("/{eventId}/activities")
    @ResponseStatus(HttpStatus.CREATED)
    public ActivityResponse createActivity(
            @PathVariable String eventId,
            @Valid @RequestBody CreateActivityRequest request,
            Authentication authentication
    ) {
        return activityService.createActivity(
                request,
                eventId,
                authentication.getName()
        );
    }

    @GetMapping("/{eventId}/activities")
    @ResponseStatus(HttpStatus.OK)
    public List<ActivityResponse> getActivitiesByEvent(
            @PathVariable String eventId,
            Authentication authentication
    ) {
        return activityService.getActivitiesByEvent(
                eventId,
                authentication.getName()
        );
    }

    @GetMapping({ "/{eventId}/activity-summaries", "/{eventId}/activities/summary" })
    @ResponseStatus(HttpStatus.OK)
    public List<ActivitySummaryResponse> getActivitySummaries(
            @PathVariable String eventId,
            Authentication authentication
    ) {
        return activityService.getActivitySummariesByEvent(
                eventId,
                authentication.getName()
        );
    }

    @GetMapping("/{eventId}/activities/{activityId}")
    @ResponseStatus(HttpStatus.OK)
    public ActivityResponse getActivity(
            @PathVariable String eventId,
            @PathVariable String activityId,
            Authentication authentication
    ) {
        if ("summary".equalsIgnoreCase(activityId)) {
            throw new BadRequestException("Invalid activity ID");
        }
        return activityService.getActivity(
                activityId,
                authentication.getName()
        );
    }

    @GetMapping("/{eventId}/activities/{activityId}/registrations")
    @ResponseStatus(HttpStatus.OK)
    public List<OrganizerRegistrationResponse> getActivityRegistrations(
            @PathVariable String eventId,
            @PathVariable String activityId,
            Authentication authentication
    ) {
        return activityRegistrationService.getRegistrationsForActivity(
                activityId,
                authentication.getName()
        );
    }

    @PutMapping("/{eventId}/activities/{activityId}")
    @ResponseStatus(HttpStatus.OK)
    public ActivityResponse updateActivity(
            @PathVariable String eventId,
            @PathVariable String activityId,
            @Valid @RequestBody UpdateActivityRequest request,
            Authentication authentication
    ) {
        return activityService.updateActivity(
                activityId,
                request,
                authentication.getName()
        );
    }

    /**
     * PATCH deliberately does NOT use @Valid.
     *
     * UpdateActivityRequest carries @NotNull/@NotBlank constraints that describe
     * a COMPLETE entity (used by PUT). Bean-validating a partial patch payload
     * would reject every valid PATCH. Business rules are validated against the
     * final merged Activity state inside ActivityService.patchActivity.
     */
    @PatchMapping("/{eventId}/activities/{activityId}")
    @ResponseStatus(HttpStatus.OK)
    public ActivityResponse patchActivity(
            @PathVariable String eventId,
            @PathVariable String activityId,
            @RequestBody UpdateActivityRequest request,
            Authentication authentication
    ) {
        return activityService.patchActivity(
                activityId,
                request,
                authentication.getName()
        );
    }

    @DeleteMapping("/{eventId}/activities/{activityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteActivity(
            @PathVariable String eventId,
            @PathVariable String activityId,
            Authentication authentication
    ) {
        activityService.deleteActivity(
                activityId,
                authentication.getName()
        );
    }

    @PostMapping("/{eventId}/activities/{activityId}/start")
    @ResponseStatus(HttpStatus.OK)
    public ActivityResponse startActivity(
            @PathVariable String eventId,
            @PathVariable String activityId,
            Authentication authentication
    ) {
        return activityService.startActivity(
                activityId,
                authentication.getName()
        );
    }

    @PostMapping("/{eventId}/activities/{activityId}/complete")
    @ResponseStatus(HttpStatus.OK)
    public ActivityResponse completeActivity(
            @PathVariable String eventId,
            @PathVariable String activityId,
            Authentication authentication
    ) {
        return activityService.completeActivity(
                activityId,
                authentication.getName()
        );
    }
}