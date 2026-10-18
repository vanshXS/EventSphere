package com.vansh.eventsphere.eventsphere.judge.service.mapper;

import com.vansh.eventsphere.eventsphere.judge.dto.*;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeCriterion;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class JudgeRoundMapper {

    public JudgeRound toRoundEntity(
            String activityId,
            String organizerId,
            CreateJudgingRoundRequest request
    ) {

        List<JudgeCriterion> criteria = request.getCriteria()
                .stream()
                .map(this::toCriterionEntity)
                .toList();

        return JudgeRound.builder()
                .activityId(activityId)
                .name(request.getName().trim())
                .description(normalizeOptionalText(request.getDescription()))
                .sequence(request.getSequence())
                .criteria(criteria)
                .status(JudgingRoundStatus.DRAFT)
                .createdBy(organizerId)
                .build();
    }

    public JudgeCriterion toCriterionEntity(
            JudgeCriterionRequest request
    ) {
        return JudgeCriterion.builder()
                .id(UUID.randomUUID().toString())
                .name(request.getName().trim())
                .description(normalizeOptionalText(request.getDescription()))
                .maxScore(request.getMaxScore())
                .weight(request.getWeight())
                .build();
    }

    public JudgeRoundResponse toRoundResponse(JudgeRound round) {

        List<JudgeCriterionResponse> criteria = round.getCriteria()
                .stream()
                .map(this::toCriterionResponse)
                .toList();

        return JudgeRoundResponse.builder()
                .id(round.getId())
                .activityId(round.getActivityId())
                .name(round.getName())
                .description(round.getDescription())
                .sequence(round.getSequence())
                .criteria(criteria)
                .status(round.getStatus())
                .createdBy(round.getCreatedBy())
                .createdAt(round.getCreatedAt())
                .updatedAt(round.getUpdatedAt())
                .build();
    }

    public JudgeCriterionResponse toCriterionResponse(
            JudgeCriterion criterion
    ) {
        return JudgeCriterionResponse.builder()
                .id(criterion.getId())
                .name(criterion.getName())
                .description(criterion.getDescription())
                .maxScore(criterion.getMaxScore())
                .weight(criterion.getWeight())
                .build();
    }

    public JudgeAssignmentResponse toAssignmentResponse(
            JudgeAssignment assignment
    ) {

        return JudgeAssignmentResponse.builder()
                .id(assignment.getId())
                .roundId(assignment.getRoundId())
                .judgeId(assignment.getJudgeId())
                .assignedBy(assignment.getAssignedBy())
                .status(assignment.getStatus())
                .assignedAt(assignment.getAssignedAt())
                .revokedAt(assignment.getRevokedAt())
                .build();
    }

    public String normalizeOptionalText(String value) {
        if(value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
