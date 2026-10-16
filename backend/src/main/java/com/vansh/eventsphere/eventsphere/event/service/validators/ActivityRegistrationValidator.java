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
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ActivityRegistrationValidator {

    private final ActivityRegistrationRepository activityRegistrationRepository;
    private final TeamRepository teamRepository;

    private static final List<RegistrationStatus> CAPACITY_STATUSES = List.of(
            RegistrationStatus.PENDING,
            RegistrationStatus.APPROVED,
            RegistrationStatus.REGISTERED
    );

    private static final List<RegistrationStatus> DUPLICATE_BLOCKING_STATUSES = List.of(
            RegistrationStatus.PENDING,
            RegistrationStatus.APPROVED,
            RegistrationStatus.REGISTERED,
            RegistrationStatus.REJECTED
    );


    public void validateRegistrationType(
            Activity activity,
            RegistrationType type
    ) {
        if(type == null) throw new BadRequestException("Registration type is required.");

        if(type == RegistrationType.BOTH){
            throw new BadRequestException(
                    "Choose individual or team registration."
            );
        }

        RegistrationType allowedType = activity.getRegistrationType();

        if(allowedType == RegistrationType.BOTH) return;

        if(allowedType != type){
            throw new BadRequestException(
                    "This activity does not allow " + type + " registration."
            );
        }
    }

    public Team validateTeamRequirements(
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
            return null;
        }

        if (request.getTeamId() == null || request.getTeamId().isBlank()) {
            throw new BadRequestException("Team ID is required for team registration");
        }

        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new ResourceNotFoundException("Team not found."));

        if (team.getMembersId() == null || !team.getMembersId().contains(participantId)) {
            throw new BadRequestException("You are not a member of this team.");
        }

        if (!participantId.equals(team.getLeaderId())) {
            throw new BadRequestException(
                    "Only the team leader can register this team for an activity."
            );
        }

        int teamSize = team.getMembersId().size();

        if (activity.getMinTeamSize() != null && teamSize < activity.getMinTeamSize()) {
            throw new BadRequestException(
                    "Team size must be at least " + activity.getMinTeamSize()
                            + " members. Your team currently has " + teamSize
                            + (teamSize == 1 ? " member." : " members.")
            );
        }

        if (activity.getMaxTeamSize() != null && teamSize > activity.getMaxTeamSize()) {
            throw new BadRequestException(
                    "Team size cannot exceed " + activity.getMaxTeamSize()
                            + " members. Your team currently has " + teamSize + " members."
            );
        }

        return team;
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
            ActivityRegistrationRequest request,
            Team team
    ) {
        if (request.getRegistrationType() == RegistrationType.INDIVIDUAL) {

            boolean ownEntry = activityRegistrationRepository
                    .existsByActivityIdAndParticipantIdAndStatusIn(
                            activityId, participantId, DUPLICATE_BLOCKING_STATUSES
                    );

            if (ownEntry) {
                throw new BadRequestException(
                        "You already have a registration or a rejected request "
                                + "for this activity."
                );
            }

            boolean insideTeamEntry = activityRegistrationRepository
                    .existsByActivityIdAndStatusInAndTeamMemberIdsIn(
                            activityId, DUPLICATE_BLOCKING_STATUSES, List.of(participantId)
                    );

            if (insideTeamEntry) {
                throw new BadRequestException(
                        "You are already part of a team entry for this activity."
                );
            }

            return;
        }

        boolean teamEntry = activityRegistrationRepository
                .existsByActivityIdAndTeamIdAndStatusIn(
                        activityId, team.getId(), DUPLICATE_BLOCKING_STATUSES
                );

        if (teamEntry) {
            throw new BadRequestException(
                    "This team already has a registration or a rejected request "
                            + "for this activity."
            );
        }

        List<String> memberIds = new ArrayList<>(team.getMembersId());

        boolean memberHasIndividualEntry = activityRegistrationRepository
                .existsByActivityIdAndStatusInAndParticipantIdIn(
                        activityId, DUPLICATE_BLOCKING_STATUSES, memberIds
                );

        if (memberHasIndividualEntry) {
            throw new BadRequestException(
                    "A member of this team already has an individual entry "
                            + "for this activity."
            );
        }

        boolean memberInAnotherTeam = activityRegistrationRepository
                .existsByActivityIdAndStatusInAndTeamMemberIdsIn(
                        activityId, DUPLICATE_BLOCKING_STATUSES, memberIds
                );

        if (memberInAnotherTeam) {
            throw new BadRequestException(
                    "A member of this team is already part of another team entry "
                            + "for this activity."
            );
        }
    }

    public void validateCapacity(Activity activity) {

        if(activity.getCapacity() == null) return;

        long occupiedCount = activityRegistrationRepository.countByActivityIdAndStatusIn(
                activity.getId(),
                CAPACITY_STATUSES
        );

        if(occupiedCount >= activity.getCapacity()) {
            throw new BadRequestException(
                    "Registration slots for this activity are full."
            );
        }

    }
}
