
package com.vansh.eventsphere.eventsphere.judge.service.validator;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.event.service.validators.ActivityOwnershipValidator;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeCriterionRequest;
import com.vansh.eventsphere.eventsphere.judge.model.Competition;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeCriterion;
import com.vansh.eventsphere.eventsphere.judge.model.enums.CompetitionMode;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.CompetitionRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class JudgeRoundValidator {

    private final ActivityRepository activityRepository;
    private final EventRepository eventRepository;
    private final JudgingRoundRepository judgingRoundRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final UserRepository userRepository;
    private final CompetitionRepository competitionRepository;
    private final ActivityOwnershipValidator activityOwnershipValidator;

    /**
     * Resolves the activity and verifies that the requesting organizer
     * owns it, either directly or through its parent event.
     *
     * organizerId follows the existing application's ownership convention.
     */
    public Activity getAndValidateOwnedActivity(
            String activityId,
            String organizerId) {

        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Activity not found."));

        String actualOwnerId;

        if (activity.getEventId() != null) {
            Event event = eventRepository.findById(activity.getEventId())
                    .orElseThrow(() ->
                            new ResourceNotFoundException("Parent event not found."));

            actualOwnerId = event.getOrganizerId();
        } else {
            actualOwnerId = activity.getOrganizerId();

        }
        if (organizerId == null || !organizerId.equals(actualOwnerId)) {
            throw new AccessDeniedException(
                    "You are not allowed to manage judging for this activity.");
        }

        return activity;
    }

    public Activity getAndValidateJudgingActivity(String activityId, String organizerId) {
        Activity activity = activityOwnershipValidator.getAndValidateOwnedActivity(
                activityId, organizerId);
        Competition competition = competitionRepository.findByActivityId(activityId)
                .orElseThrow(() -> new BadRequestException(
                        "Configure judging for this activity before managing rounds."));
        if (!competition.isJudgingEnabled()) {
            throw new BadRequestException("Judging is not enabled for this activity.");
        }
        return activity;
    }

    public void validateRoundCapacity(String activityId, String roundId) {
        Competition competition = competitionRepository.findByActivityId(activityId)
                .orElseThrow(() -> new BadRequestException(
                        "Configure judging for this activity before managing rounds."));
        if (competition.getCompetitionMode() != CompetitionMode.SINGLE_STAGE) {
            return;
        }

        boolean anotherRoundExists = judgingRoundRepository
                .findByActivityIdOrderBySequenceAsc(activityId)
                .stream()
                .anyMatch(round -> !Objects.equals(round.getId(), roundId));
        if (anotherRoundExists) {
            throw new BadRequestException(
                    "A single-stage competition can have only one judging round.");
        }
    }

    /**
     * Checks the domain invariant that criterion names must be unique
     * within a round, ignoring case and surrounding whitespace.
     *
     * DTO Bean Validation is responsible for required fields and field limits.
     */
    public void validateUniqueCriterionNames(
            List<JudgeCriterionRequest> criteria) {

        Set<String> normalizedNames = new HashSet<>();

        for (JudgeCriterionRequest criterion : criteria) {
            String normalizedName =
                    criterion.getName().trim().toLowerCase(Locale.ROOT);

            if (!normalizedNames.add(normalizedName)) {
                throw new BadRequestException(
                        "Criterion names must be unique within a round.");
            }
        }
    }

    /**
     * Provides an early, user-friendly duplicate-sequence error.
     * The database unique index must still protect against concurrent requests.
     */
    public void validateSequenceAvailable(
            String activityId,
            Integer sequence) {

        if (judgingRoundRepository
                .existsByActivityIdAndSequence(activityId, sequence)) {

            throw new BadRequestException(
                    "A judging round with this sequence already exists.");
        }
    }

    public void validateSchedule(
            Activity activity,
            String roundId,
            java.time.LocalDateTime scheduledStartDateTime,
            java.time.LocalDateTime scheduledEndDateTime,
            String scheduledTimeZoneId
    ) {
        if (scheduledTimeZoneId != null && !scheduledTimeZoneId.isBlank()) {
            try {
                ZoneId.of(scheduledTimeZoneId);
            } catch (DateTimeException exception) {
                throw new BadRequestException("The judging round timezone is invalid.");
            }
        }
        if (scheduledStartDateTime != null
                && scheduledEndDateTime != null
                && !scheduledEndDateTime.isAfter(scheduledStartDateTime)) {
            throw new BadRequestException(
                    "Judging round end time must be after its start time.");
        }

        if (scheduledStartDateTime != null
                && activity.getStartDateTime() != null
                && scheduledStartDateTime.isBefore(activity.getStartDateTime())) {
            throw new BadRequestException(
                    "Judging round cannot start before the activity's scheduled start.");
        }

        if (scheduledStartDateTime != null
                && activity.getEndDateTime() != null
                && scheduledStartDateTime.isAfter(activity.getEndDateTime())) {
            throw new BadRequestException(
                    "Judging round cannot start after the activity's scheduled end.");
        }

        if (scheduledEndDateTime != null
                && activity.getStartDateTime() != null
                && scheduledEndDateTime.isBefore(activity.getStartDateTime())) {
            throw new BadRequestException(
                    "Judging round cannot end before the activity's scheduled start.");
        }

        if (scheduledEndDateTime != null
                && activity.getEndDateTime() != null
                && scheduledEndDateTime.isAfter(activity.getEndDateTime())) {
            throw new BadRequestException(
                    "Judging round cannot end after the activity's scheduled end.");
        }

        if (scheduledStartDateTime == null || scheduledEndDateTime == null) {
            return;
        }

        boolean overlaps = judgingRoundRepository
                .findByActivityIdOrderBySequenceAsc(activity.getId())
                .stream()
                .filter(existing -> !Objects.equals(existing.getId(), roundId))
                .filter(existing -> existing.getScheduledStartDateTime() != null
                        && existing.getScheduledEndDateTime() != null)
                .anyMatch(existing ->
                        scheduledStartDateTime.isBefore(existing.getScheduledEndDateTime())
                                && scheduledEndDateTime.isAfter(existing.getScheduledStartDateTime()));

        if (overlaps) {
            throw new BadRequestException(
                    "This schedule overlaps another judging round for the activity.");
        }
    }

    /**
     * Returns a round only if it exists and remains editable.
     */
    public JudgeRound getAndValidateDraftRound(String roundId) {

        JudgeRound round = judgingRoundRepository.findById(roundId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Judging round not found."));

        if (round.getStatus() != JudgingRoundStatus.DRAFT) {
            throw new BadRequestException(
                    "This operation is only allowed while the round is in DRAFT status.");
        }

        return round;
    }

    /**
     * Resolves a judge and verifies that the account is eligible for assignment.
     */
    public User getAndValidateActiveJudge(String judgeId) {

        User judge = userRepository.findById(judgeId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Judge user not found."));

        if (judge.getRole() != Role.JUDGE || !judge.isActive()) {
            throw new BadRequestException(
                    "The selected user must be an active judge.");
        }

        return judge;
    }

    public User getAndValidateActiveJudgeByEmail(String email) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        User judge = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active judge account was found for this email. Invite the address if they are new to EventSphere."));

        if (judge.getRole() != Role.JUDGE || !judge.isActive()) {
            throw new BadRequestException(
                    "No active judge account was found for this email. Invite the address if they are new to EventSphere.");
        }
        return judge;
    }

    /**
     * Rejects an existing active assignment.
     * A revoked assignment may be reactivated by the service instead of
     * creating a second document for the same round and judge.
     */
    public void validateJudgeNotAlreadyAssigned(
            String roundId,
            String judgeId) {

        var existing = judgeAssignmentRepository
                .findByRoundIdAndJudgeId(roundId, judgeId);

        if (existing.isPresent()
                && existing.get().getStatus() == JudgeAssignmentStatus.ACTIVE) {

            throw new BadRequestException(
                    "This judge is already assigned to the round.");
        }

    }

    public void validateCriterionWeightsTotal100(
            List<JudgeCriterionRequest> criteria
    ) {

        BigDecimal totalWeight = BigDecimal.ZERO;

        for(JudgeCriterionRequest criterion : criteria) {
            if(criterion == null) throw new BadRequestException(
                    "Every criterion must be a weight"
            );
            totalWeight = totalWeight.add(criterion.getWeight());
        }

        if(totalWeight.compareTo(new BigDecimal("100")) != 0) {
            throw new BadRequestException(
                    "Judging criterion weights must total exactly 100."
            );
        }
    }

    public void validateRoundCanOpen(JudgeRound round) {

        if (round.getScheduledStartDateTime() == null
                || round.getScheduledEndDateTime() == null
                || !round.getScheduledEndDateTime().isAfter(round.getScheduledStartDateTime())) {
            throw new BadRequestException(
                    "Set a valid judging round start and end schedule before opening it.");
        }

        if(round.getCriteria() == null || round.getCriteria().isEmpty()){
            throw new BadRequestException(
                    "A round must have at least one judging criterion."
            );
        }

        BigDecimal totalWeight = BigDecimal.ZERO;
        Set<String> criterionIds = new HashSet<>();
        Set<String> criterionNames = new HashSet<>();

        for(JudgeCriterion criterion : round.getCriteria()) {
            if(criterion.getId() == null
            || criterion.getId().isBlank()
            || !criterionIds.add(criterion.getId())) {
                throw new BadRequestException(
                        "Every judging criterion must have a unique ID."
                );
            }

            if(criterion.getName() == null
            || criterion.getName().isBlank()
            ||!criterionNames.add(
                    criterion.getName().trim().toLowerCase(Locale.ROOT)
            )) {
                throw new BadRequestException(
                        "Every judging criterion must have a unique name."
                );
            }

            if(criterion.getMaxScore() == null
            || criterion.getMaxScore().signum() <= 0
            || criterion.getWeight() == null
            || criterion.getWeight().signum() <= 0) {

                throw new BadRequestException(
                        "Each criterion must have a positive maximum score and weight."
                );
            }

            totalWeight = totalWeight.add(criterion.getWeight());

        }
        if(totalWeight.compareTo(new BigDecimal("100")) != 0) {
            throw new BadRequestException(
                    "Judging criterion weights must total exactly 100."
            );
        }

        boolean hasActiveJudge = !judgeAssignmentRepository
                .findByRoundIdAndStatus(
                        round.getId(), JudgeAssignmentStatus.ACTIVE
                ).isEmpty();
        if(!hasActiveJudge) {
            throw  new BadRequestException(
                    "Assign at least one active judge before opening the round."
            );
        }
    }

    public JudgeRound getAndValidateOpenRound(String roundId) {
        JudgeRound round = judgingRoundRepository.findById(roundId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Judging round not found.")
                );

        if(round.getStatus() != JudgingRoundStatus.OPEN){
            throw new BadRequestException(
                    "This operation is only allowed while the round is OPEN."
            );
        }

        return round;
    }


}
