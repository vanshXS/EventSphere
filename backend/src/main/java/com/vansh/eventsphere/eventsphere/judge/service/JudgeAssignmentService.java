
package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeAssignmentResponse;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.service.mapper.JudgeRoundMapper;
import com.vansh.eventsphere.eventsphere.judge.service.validator.JudgeRoundValidator;
import com.vansh.eventsphere.eventsphere.user.model.User;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class JudgeAssignmentService {

    private final JudgeRoundValidator judgingRoundValidator;
    private final JudgingRoundRepository judgingRoundRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final JudgeRoundMapper judgingRoundMapper;

    /**
     * Assigns one active judge to one draft round.
     * A previously revoked assignment is reactivated.
     */
    public JudgeAssignmentResponse assignJudgeToRound(
            String roundId,
            String judgeId,
            String organizerId) {

        JudgeRound round =
                getAndValidateDraftRoundForOrganizer(roundId, organizerId);

        User judge = judgingRoundValidator.getAndValidateActiveJudge(judgeId);
        String validatedJudgeId = judge.getUserId();

        Optional<JudgeAssignment> existing =
                judgeAssignmentRepository.findByRoundIdAndJudgeId(
                        round.getId(), validatedJudgeId);

        if (existing.isPresent()
                && existing.get().getStatus() == JudgeAssignmentStatus.ACTIVE) {
            throw new BadRequestException(
                    "This judge is already assigned to the round.");
        }

        JudgeAssignment savedAssignment;

        if (existing.isPresent()) {
            // Reactivate the existing record instead of creating a duplicate.
            JudgeAssignment assignment = existing.get();
            LocalDateTime now = LocalDateTime.now();

            assignment.setStatus(JudgeAssignmentStatus.ACTIVE);
            assignment.setAssignedBy(organizerId);
            assignment.setAssignedAt(now);
            assignment.setRevokedAt(null);
            assignment.setUpdatedAt(now);

            savedAssignment = judgeAssignmentRepository.save(assignment);
        } else {
            savedAssignment = createActiveAssignment(
                    round.getId(), validatedJudgeId, organizerId);
        }

        return judgingRoundMapper.toAssignmentResponse(savedAssignment);
    }

    /**
     * Revokes a judge's access to a draft or open round.
     * Revocation is allowed during judging so access can be withdrawn promptly.
     */
    public JudgeAssignmentResponse revokeJudgeFromRound(
            String roundId,
            String judgeId,
            String organizerId) {

        JudgeRound round =
                getAndValidateOwnedRound(roundId, organizerId);

        if (round.getStatus() != JudgingRoundStatus.DRAFT
                && round.getStatus() != JudgingRoundStatus.OPEN) {
            throw new BadRequestException(
                    "Assignments can only be revoked while the round is DRAFT or OPEN.");
        }

        if(judgeId == null || judgeId.isBlank()){
            throw new BadRequestException(
                    "Judge Id is required"
            );
        }

        // The supplied judge ID must resolve to an actual judge account.
        User judge = judgingRoundValidator.getAndValidateActiveJudge(judgeId);
        String validatedJudgeId = judge.getUserId();

        JudgeAssignment assignment = judgeAssignmentRepository
                .findByRoundIdAndJudgeId(round.getId(), validatedJudgeId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Judge assignment not found."));

        // Repeating a revoke request is safe and does not alter the history.
        if (assignment.getStatus() == JudgeAssignmentStatus.REVOKED) {
            return judgingRoundMapper.toAssignmentResponse(assignment);
        }

        LocalDateTime now = LocalDateTime.now();

        assignment.setStatus(JudgeAssignmentStatus.REVOKED);
        assignment.setRevokedAt(now);
        assignment.setUpdatedAt(now);

        JudgeAssignment savedAssignment =
                judgeAssignmentRepository.save(assignment);

        return judgingRoundMapper.toAssignmentResponse(savedAssignment);
    }

    /**
     * Applies a panel to multiple draft rounds belonging to the same Activity.
     *
     * This operation is idempotent: active assignments are left unchanged,
     * revoked assignments are reactivated, and missing assignments are created.
     */
    public List<JudgeAssignmentResponse> assignJudgesToRounds(
            List<String> roundIds,
            List<String> judgeIds,
            String organizerId) {

        validateUniqueIds(roundIds, "Round IDs");
        validateUniqueIds(judgeIds, "Judge IDs");

        // Prevalidate every round before making any writes.
        List<JudgeRound> rounds = new ArrayList<>();
        String commonActivityId = null;

        for (String roundId : roundIds) {
            JudgeRound round =
                    getAndValidateDraftRoundForOrganizer(roundId, organizerId);

            if (commonActivityId == null) {
                commonActivityId = round.getActivityId();
            } else if (!commonActivityId.equals(round.getActivityId())) {
                throw new BadRequestException(
                        "Bulk assignment can only target rounds from the same activity.");
            }

            rounds.add(round);
        }

        // Prevalidate every judge before making any writes.
        List<String> validatedJudgeIds = new ArrayList<>();

        for (String judgeId : judgeIds) {
            User judge =
                    judgingRoundValidator.getAndValidateActiveJudge(judgeId);

            validatedJudgeIds.add(judge.getUserId());
        }

        List<JudgeAssignmentResponse> responses = new ArrayList<>();

        for (JudgeRound round : rounds) {
            for (String validatedJudgeId : validatedJudgeIds) {
                JudgeAssignment assignment = ensureActiveAssignment(
                        round.getId(), validatedJudgeId, organizerId);

                responses.add(
                        judgingRoundMapper.toAssignmentResponse(assignment));
            }
        }

        return responses;
    }

    /**
     * Copies currently active assignments from a source round to a target
     * draft round in the same Activity. Existing target assignments are kept.
     */
    public List<JudgeAssignmentResponse> copyAssignmentsFromRound(
            String sourceRoundId,
            String targetRoundId,
            String organizerId) {

        if (sourceRoundId == null || sourceRoundId.equals(targetRoundId)) {
            throw new BadRequestException(
                    "Source and target rounds must be different.");
        }

        JudgeRound sourceRound =
                getAndValidateOwnedRound(sourceRoundId, organizerId);

        JudgeRound targetRound =
                getAndValidateDraftRoundForOrganizer(
                        targetRoundId, organizerId);

        if (!sourceRound.getActivityId().equals(targetRound.getActivityId())) {
            throw new BadRequestException(
                    "Assignments can only be copied between rounds of the same activity.");
        }

        List<JudgeAssignment> sourceAssignments =
                judgeAssignmentRepository.findByRoundIdAndStatus(
                        sourceRound.getId(), JudgeAssignmentStatus.ACTIVE);

        if (sourceAssignments.isEmpty()) {
            throw new BadRequestException(
                    "The source round has no active judge assignments to copy.");
        }

        // Confirm all source judges are still active before making writes.
        List<String> validatedJudgeIds = new ArrayList<>();

        for (JudgeAssignment sourceAssignment : sourceAssignments) {
            User judge = judgingRoundValidator.getAndValidateActiveJudge(
                    sourceAssignment.getJudgeId());

            validatedJudgeIds.add(judge.getUserId());
        }

        // Idempotently apply the source panel to the target round.
        for (String validatedJudgeId : validatedJudgeIds) {
            ensureActiveAssignment(
                    targetRound.getId(), validatedJudgeId, organizerId);
        }

        // Return the complete active target panel, including previous assignments.
        return judgeAssignmentRepository
                .findByRoundIdAndStatus(
                        targetRound.getId(), JudgeAssignmentStatus.ACTIVE)
                .stream()
                .map(judgingRoundMapper::toAssignmentResponse)
                .toList();
    }

    /**
     * Returns assignment history for a round, including revoked assignments.
     */
    public List<JudgeAssignmentResponse> getAssignments(
            String roundId,
            String organizerId) {

        JudgeRound round =
                getAndValidateOwnedRound(roundId, organizerId);

        return judgeAssignmentRepository.findByRoundId(round.getId())
                .stream()
                .map(judgingRoundMapper::toAssignmentResponse)
                .toList();
    }

    private JudgeRound getAndValidateDraftRoundForOrganizer(
            String roundId,
            String organizerId) {

        JudgeRound round =
                judgingRoundValidator.getAndValidateDraftRound(roundId);

        Activity activity =
                judgingRoundValidator.getAndValidateOwnedActivity(
                        round.getActivityId(), organizerId);

        judgingRoundValidator.getAndValidateMultiRoundCompetition(
                activity.getId(), organizerId);

        return round;
    }

    private JudgeRound getAndValidateOwnedRound(
            String roundId,
            String organizerId) {

        JudgeRound round = judgingRoundRepository.findById(roundId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Judging round not found."));

        judgingRoundValidator.getAndValidateOwnedActivity(
                round.getActivityId(), organizerId);

        return round;
    }

    private JudgeAssignment ensureActiveAssignment(
            String roundId,
            String judgeId,
            String organizerId) {

        Optional<JudgeAssignment> existing =
                judgeAssignmentRepository.findByRoundIdAndJudgeId(
                        roundId, judgeId);

        if (existing.isPresent()) {
            JudgeAssignment assignment = existing.get();

            if (assignment.getStatus() == JudgeAssignmentStatus.ACTIVE) {
                return assignment;
            }

            LocalDateTime now = LocalDateTime.now();

            assignment.setStatus(JudgeAssignmentStatus.ACTIVE);
            assignment.setAssignedBy(organizerId);
            assignment.setAssignedAt(now);
            assignment.setRevokedAt(null);
            assignment.setUpdatedAt(now);

            return judgeAssignmentRepository.save(assignment);
        }

        return createActiveAssignment(roundId, judgeId, organizerId);
    }

    private JudgeAssignment createActiveAssignment(
            String roundId,
            String judgeId,
            String organizerId) {

        LocalDateTime now = LocalDateTime.now();

        JudgeAssignment assignment = JudgeAssignment.builder()
                .roundId(roundId)
                .judgeId(judgeId)
                .assignedBy(organizerId)
                .status(JudgeAssignmentStatus.ACTIVE)
                .assignedAt(now)
                .revokedAt(null)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return judgeAssignmentRepository.save(assignment);
    }

    private void validateUniqueIds(List<String> ids, String fieldName) {
        if (ids == null || ids.isEmpty()) {
            throw new BadRequestException(
                    fieldName + " must contain at least one value.");
        }

        Set<String> uniqueIds = new HashSet<>();

        for (String id : ids) {
            if (id == null || id.isBlank()) {
                throw new BadRequestException(
                        fieldName + " cannot contain blank values.");
            }

            if (!uniqueIds.add(id)) {
                throw new BadRequestException(
                        fieldName + " must not contain duplicates.");
            }
        }
    }
}
