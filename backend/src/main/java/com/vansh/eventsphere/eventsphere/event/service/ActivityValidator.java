package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.event.dto.CreateActivityRequest;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import org.springframework.stereotype.Component;

@Component
public class ActivityValidator {


    public void validate(
            CreateActivityRequest request,
            Event event
    ){
        validateActivityTime(request);
        validateRegistrationDeadline(request);
        validateEventBoundary(request, event);
        validateRegistrationType(request);
    }


    private void validateActivityTime(CreateActivityRequest request) {
        if(!request.getStartDateTime().isBefore(request.getEndDateTime())){
            throw new IllegalArgumentException(
                    "Activity start time must be before end time."
            );
        }
    }

    private void validateRegistrationDeadline(CreateActivityRequest createActivityRequest) {

        if(createActivityRequest.getRegistrationDeadline().isAfter(createActivityRequest.getStartDateTime())){
            throw new IllegalArgumentException(
                    "Registration deadline cannot be after activity start date."
            );
        }
    }

    private void validateEventBoundary(
            CreateActivityRequest request,
            Event event
    ) {

        if(event.getStartDateTime() != null && request.getStartDateTime().isBefore(event.getStartDateTime())){
            throw new IllegalArgumentException(
                    "Activity cannot start before the event."
            );
        }
        if(event.getEndDateTime() != null && request.getEndDateTime().isAfter(event.getEndDateTime())) {
            throw new IllegalArgumentException(
                    "Activity cannot end after the event."
            );
        }

    }

    private void validateRegistrationType(CreateActivityRequest request) {

        if (request.getRegistrationType() == RegistrationType.TEAM || request.getRegistrationType() == RegistrationType.BOTH) {

            if (request.getMinTeamSize() == null ||
                    request.getMaxTeamSize() == null) {

                throw new IllegalArgumentException(
                        "Team size limits are required for team registration"
                );
            }

            if (request.getMinTeamSize() <= 0) {

                throw new IllegalArgumentException(
                        "Minimum team size must be greater than 0"
                );
            }

            if (request.getMaxTeamSize() < request.getMinTeamSize()) {

                throw new IllegalArgumentException(
                        "Maximum team size cannot be less than minimum team size"
                );
            }

        } else {

            if (request.getMinTeamSize() != null ||
                    request.getMaxTeamSize() != null) {

                throw new IllegalArgumentException(
                        "Team size limits should only be provided for team registration"
                );
            }
        }
    }
}
