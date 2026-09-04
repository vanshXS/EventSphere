package com.vansh.eventsphere.eventsphere.event.service.validators;

import com.vansh.eventsphere.eventsphere.event.dto.CreateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.dto.UpdateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class ActivityValidator {

    // =========================================================
    // CREATE
    // =========================================================

    public void validate(
            CreateActivityRequest request,
            Event parentEvent
    ) {
        validate(
                request.getRegistrationDeadline(),
                request.getStartDateTime(),
                request.getEndDateTime(),
                request.getRegistrationType(),
                request.getCapacity(),
                request.getMinTeamSize(),
                request.getMaxTeamSize(),
                request.getVisibility(),
                parentEvent
        );
    }


    // =========================================================
    // UPDATE
    // =========================================================

    public void validate(
            UpdateActivityRequest request,
            Event parentEvent
    ) {
        validate(
                request.getRegistrationDeadline(),
                request.getStartDateTime(),
                request.getEndDateTime(),
                request.getRegistrationType(),
                request.getCapacity(),
                request.getMinTeamSize(),
                request.getMaxTeamSize(),
                request.getVisibility(),
                parentEvent
        );
    }


    // =========================================================
    // PATCH
    // =========================================================

    public void validate(
            Activity activity,
            Event parentEvent
    ) {
        validate(
                activity.getRegistrationDeadline(),
                activity.getStartDateTime(),
                activity.getEndDateTime(),
                activity.getRegistrationType(),
                activity.getCapacity(),
                activity.getMinTeamSize(),
                activity.getMaxTeamSize(),
                activity.getVisibility(),
                parentEvent
        );
    }


    // =========================================================
    // COMMON VALIDATION
    // =========================================================

    private void validate(
            LocalDateTime deadline,
            LocalDateTime start,
            LocalDateTime end,
            RegistrationType registrationType,
            Integer capacity,
            Integer minTeamSize,
            Integer maxTeamSize,
            EventVisibility visibility,
            Event parentEvent
    ) {

        // -----------------------------------------
        // Basic timing
        // -----------------------------------------

        if (start == null || end == null) {
            throw new BadRequestException(
                    "Activity start time and end time are required."
            );
        }

        if (!start.isBefore(end)) {
            throw new BadRequestException(
                    "Activity end time must be after its start time."
            );
        }

        if (deadline == null) {
            throw new BadRequestException(
                    "Registration deadline is required."
            );
        }

        if (!deadline.isBefore(start)) {
            throw new BadRequestException(
                    "Registration deadline must be before the activity starts."
            );
        }


        // -----------------------------------------
        // Capacity
        // -----------------------------------------

        if (capacity != null && capacity <= 0) {
            throw new BadRequestException(
                    "Registration capacity must be greater than 0, or choose unlimited."
            );
        }


        // -----------------------------------------
        // Registration type / team size
        // -----------------------------------------

        if (registrationType == null) {
            throw new BadRequestException(
                    "Registration type is required."
            );
        }

        if (registrationType == RegistrationType.INDIVIDUAL) {

            if (minTeamSize != null || maxTeamSize != null) {
                throw new BadRequestException(
                        "Team size limits are only valid when team registration is enabled."
                );
            }

        } else {

            if (minTeamSize == null || maxTeamSize == null) {
                throw new BadRequestException(
                        "Minimum and maximum team sizes are required for team registration."
                );
            }

            if (minTeamSize <= 0) {
                throw new BadRequestException(
                        "Minimum team size must be greater than 0."
                );
            }

            if (maxTeamSize < minTeamSize) {
                throw new BadRequestException(
                        "Maximum team size cannot be smaller than minimum team size."
                );
            }
        }


        // -----------------------------------------
        // Visibility
        // -----------------------------------------

        /*
         * Standalone activities are discovered directly by participants, so
         * they must declare their own visibility. Event activities inherit
         * visibility from the parent Event, so any value sent for them is
         * ignored rather than validated.
         */
        if (parentEvent == null && visibility == null) {
            throw new BadRequestException(
                    "Visibility is required for a standalone activity."
            );
        }

        // -----------------------------------------
        // Parent Event boundaries
        // -----------------------------------------

        if (parentEvent != null) {

            if (start.isBefore(parentEvent.getStartDateTime())) {
                throw new BadRequestException(
                        "Activity start time must be within the Event schedule."
                );
            }

            if (end.isAfter(parentEvent.getEndDateTime())) {
                throw new BadRequestException(
                        "Activity end time must be within the Event schedule."
                );
            }
        }
    }
}