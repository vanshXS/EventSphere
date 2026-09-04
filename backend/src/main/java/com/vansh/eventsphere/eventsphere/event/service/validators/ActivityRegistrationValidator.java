package com.vansh.eventsphere.eventsphere.event.service.validators;

import com.vansh.eventsphere.eventsphere.event.dto.ActivityRegistrationRequest;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import com.vansh.eventsphere.eventsphere.event.model.Team;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.TeamRepository;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class ActivityRegistrationValidator {

    private final ActivityRegistrationRepository activityRegistrationRepository;
    private final TeamRepository teamRepository;

    public void validateRegistrationType(
            Activity activity,
            RegistrationType type
    ) {
        if(type == null) throw new BadRequestException("Registration type is required.");

        RegistrationType allowedType = activity.getRegistrationType();

        if(allowedType == RegistrationType.BOTH) return;

        if(allowedType != type){
            throw new BadRequestException(
                    "This activity does not allow " + type + " registration."
            );
        }
    }

    public void validateTeamRequirements(
            Activity activity,
            ActivityRegistrationRequest request,
            String participantId
    ) {
        RegistrationType type = request.getRegistrationType();

        if (type == RegistrationType.INDIVIDUAL) {
            if (request.getTeamId() != null) {
                throw new BadRequestException(
                        "Team ID must not be provided for individual registration."
                );
            }
            return;
        }

        if (request.getTeamId() == null || request.getTeamId().isBlank()) {
            throw new BadRequestException("Team ID is required for team registration");
        }

        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Team not found."
                ));

        if (team.getMembersId() == null || !team.getMembersId().contains(participantId)) {
            throw new BadRequestException(
                    "You are not a member of this team."
            );
        }

        int teamSize = team.getMembersId() != null ? team.getMembersId().size() : 0;

        if (activity.getMinTeamSize() != null && teamSize < activity.getMinTeamSize()) {
            throw new BadRequestException(
                    "Team size must be at least " + activity.getMinTeamSize() + " members. Your team currently has " + teamSize + (teamSize == 1 ? " member." : " members.")
            );
        }

        if (activity.getMaxTeamSize() != null && teamSize > activity.getMaxTeamSize()) {
            throw new BadRequestException(
                    "Team size cannot exceed " + activity.getMaxTeamSize() + " members. Your team currently has " + teamSize + " members."
            );
        }
    }

    public void validateRegistrationDeadline(
            Activity activity
    ) {
        if(activity.getRegistrationDeadline() == null) throw new BadRequestException("Registration deadline is not configured.");

        if(!LocalDateTime.now().isBefore(activity.getRegistrationDeadline())){
            throw new BadRequestException(
                    "Registration for this activity has closed."
            );
        }
    }

    public void validateDuplicateRegistration(
            String activityId,
            String participantId,
            ActivityRegistrationRequest request
    ) {
        if(request.getRegistrationType() == RegistrationType.INDIVIDUAL) {
            if(activityRegistrationRepository.existsByActivityIdAndParticipantIdAndStatus(
                    activityId,
                    participantId,
                    RegistrationStatus.REGISTERED
            )) {
                throw new BadRequestException(
                        "You are already registered for this activity."
                );
            }
            return;
        }

        if(activityRegistrationRepository.existsByActivityIdAndTeamIdAndStatus(
                activityId,
                request.getTeamId(),
                RegistrationStatus.REGISTERED
        )) {
            throw new BadRequestException(
                    "This team is already registered for this activity."
            );
        }
    }

    public void validateCapacity(Activity activity) {

        if(activity.getCapacity() == null) return;

        long registerCount = activityRegistrationRepository.countByActivityIdAndStatus(
                activity.getId(),
                RegistrationStatus.REGISTERED
        );

        if(registerCount >= activity.getCapacity()) {
            throw new BadRequestException(
                    "Registration slots for this activity are full."
            );
        }

    }
}
