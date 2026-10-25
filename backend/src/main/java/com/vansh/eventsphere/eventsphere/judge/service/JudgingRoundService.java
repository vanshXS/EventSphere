package com.vansh.eventsphere.eventsphere.judge.service;


import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.judge.dto.CreateJudgingRoundRequest;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeRoundResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.RoundClosurePreviewResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.UpdateJudgeRoundRequest;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeEvaluation;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeEvaluationStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeEvaluationRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.service.mapper.JudgeRoundMapper;
import com.vansh.eventsphere.eventsphere.judge.service.validator.JudgeRoundValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class JudgingRoundService{

    private final JudgeRoundValidator validator;
    private final JudgeRoundMapper mapper;
    private final JudgingRoundRepository judgingRoundRepository;
    private final JudgeAssignmentRepository assignmentRepository;
    private final JudgeEvaluationRepository evaluationRepository;
    private final ActivityRegistrationRepository registrationRepository;

    private static final List<RegistrationStatus> ELIGIBLE_STATUSES =
            List.of(RegistrationStatus.APPROVED, RegistrationStatus.REGISTERED);

    public JudgeRoundResponse createRound(
            String activityId,
            CreateJudgingRoundRequest request,
            String organizerId
    ){

        // verify that the activity exists and belongs to the organizer.
        Activity activity =
                validator.getAndValidateJudgingActivity(activityId, organizerId);
        validator.validateSchedule(
                activity,
                null,
                request.getScheduledStartDateTime(),
                request.getScheduledEndDateTime(),
                request.getScheduledTimeZoneId());

        validator.validateRoundCapacity(activityId, null);

        // 3. Validate business rules not covered by DTO annotations.
        validator.validateUniqueCriterionNames(request.getCriteria());

        validator.validateCriterionWeightsTotal100(request.getCriteria());

        validator.validateSequenceAvailable(activity.getId(), request.getSequence());

        //convert the request into a domain model
        JudgeRound round = mapper.toRoundEntity(
                activity.getId(), organizerId, request
        );

        round.setCreatedAt(LocalDateTime.now());
        round.setUpdatedAt(LocalDateTime.now());

        JudgeRound savedRound = judgingRoundRepository.save(round);

        return mapper.toRoundResponse(savedRound);


    }

    public List<JudgeRoundResponse> getRoundsByActivity(String activityId, String organizerId){

        Activity activity =
                validator.getAndValidateOwnedActivity(
                        activityId, organizerId
                );

        return judgingRoundRepository
                .findByActivityIdOrderBySequenceAsc(activity.getId())
                .stream()
                .map(mapper::toRoundResponse)
                .toList();
    }

    public JudgeRoundResponse updateDraftRound(
            String roundId,
            UpdateJudgeRoundRequest request,
            String organizerId
    ) {
        JudgeRound round = validator.getAndValidateDraftRound(roundId);
        Activity activity = validator.getAndValidateJudgingActivity(
                round.getActivityId(), organizerId);
        validator.validateRoundCapacity(activity.getId(), round.getId());
        validator.validateUniqueCriterionNames(request.getCriteria());
        validator.validateCriterionWeightsTotal100(request.getCriteria());
        validator.validateSchedule(
                activity,
                round.getId(),
                request.getScheduledStartDateTime(),
                request.getScheduledEndDateTime(),
                request.getScheduledTimeZoneId());

        mapper.updateDraftRound(round, request);
        round.setUpdatedAt(LocalDateTime.now());
        return mapper.toRoundResponse(judgingRoundRepository.save(round));
    }

    public JudgeRoundResponse openRound(String roundId, String organizerId){

        JudgeRound round = validator.getAndValidateDraftRound(roundId);

        Activity activity =
                validator.getAndValidateJudgingActivity(round.getActivityId(), organizerId);
        validator.validateSchedule(
                activity,
                round.getId(),
                round.getScheduledStartDateTime(),
                round.getScheduledEndDateTime(),
                round.getScheduledTimeZoneId());

        if (activity.getActualStartDateTime() == null
                && activity.getStatus() != EventStatus.ONGOING) {
            throw new BadRequestException(
                    "Cannot open a judging round before the activity has actually started."
            );
        }

        if (round.getScheduledStartDateTime() == null
                || round.getScheduledEndDateTime() == null) {
            throw new BadRequestException(
                    "Set the judging round schedule before opening it.");
        }

        //The round cannot open without an eligible rubric and judge panel.
        validator.validateRoundCanOpen(round);


        round.setStatus(JudgingRoundStatus.OPEN);
        round.setOpenedAt(LocalDateTime.now());
        round.setUpdatedAt(LocalDateTime.now());

        JudgeRound savedRound = judgingRoundRepository.save(round);

        return mapper.toRoundResponse(savedRound);
    }

    public RoundClosurePreviewResponse getClosurePreview(
            String roundId,
            String organizerId
    ) {
        JudgeRound round = validator.getAndValidateOpenRound(roundId);
        validator.getAndValidateJudgingActivity(round.getActivityId(), organizerId);
        return calculateClosurePreview(round);
    }

    public JudgeRoundResponse closeRound(
            String roundId,
            String organizerId
    ){

        JudgeRound round = validator.getAndValidateOpenRound(roundId);

        validator.getAndValidateJudgingActivity(round.getActivityId(), organizerId);

        RoundClosurePreviewResponse preview = calculateClosurePreview(round);
        if (preview.getMissingEvaluationCount() > 0) {
            throw new BadRequestException(
                    preview.getMissingEvaluationCount()
                            + " required evaluation(s) are still missing. The round must remain open until all required evaluations are submitted."
            );
        }

        round.setStatus(JudgingRoundStatus.CLOSED);
        round.setClosedAt(LocalDateTime.now());
        round.setUpdatedAt(LocalDateTime.now());

        JudgeRound savedRound = judgingRoundRepository.save(round);

        return mapper.toRoundResponse(savedRound);
    }

    private RoundClosurePreviewResponse calculateClosurePreview(JudgeRound round) {
        List<JudgeAssignment> activeAssignments =
                assignmentRepository.findByRoundIdAndStatus(
                        round.getId(),
                        JudgeAssignmentStatus.ACTIVE);
        List<ActivityRegistration> eligibleRegistrations =
                registrationRepository.findByActivityIdAndStatusIn(
                        round.getActivityId(),
                        ELIGIBLE_STATUSES);
        List<JudgeEvaluation> submittedEvaluations =
                evaluationRepository.findByRoundIdAndStatus(
                        round.getId(),
                        JudgeEvaluationStatus.SUBMITTED);

        Set<String> activeJudgeIds = new HashSet<>();
        for (JudgeAssignment assignment : activeAssignments) {
            activeJudgeIds.add(assignment.getJudgeId());
        }

        Set<String> eligibleRegistrationIds = new HashSet<>();
        for (ActivityRegistration registration : eligibleRegistrations) {
            eligibleRegistrationIds.add(registration.getId());
        }

        Set<String> completedPairs = new HashSet<>();
        for (JudgeEvaluation evaluation : submittedEvaluations) {
            if (activeJudgeIds.contains(evaluation.getJudgeId())
                    && eligibleRegistrationIds.contains(
                    evaluation.getRegistrationId())) {
                completedPairs.add(pairKey(
                        evaluation.getJudgeId(),
                        evaluation.getRegistrationId()));
            }
        }

        int requiredCount = activeJudgeIds.size() * eligibleRegistrationIds.size();
        int submittedCount = completedPairs.size();

        return RoundClosurePreviewResponse.builder()
                .activeJudgeCount(activeJudgeIds.size())
                .eligibleEntryCount(eligibleRegistrationIds.size())
                .requiredEvaluationCount(requiredCount)
                .submittedEvaluationCount(submittedCount)
                .missingEvaluationCount(requiredCount - submittedCount)
                .build();
    }

    private String pairKey(String judgeId, String registrationId) {
        return judgeId + ":" + registrationId;
    }

}