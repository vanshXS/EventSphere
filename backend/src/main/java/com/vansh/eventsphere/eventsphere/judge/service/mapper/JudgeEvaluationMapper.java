package com.vansh.eventsphere.eventsphere.judge.service.mapper;

import com.vansh.eventsphere.eventsphere.judge.dto.CriterionScoreRequest;
import com.vansh.eventsphere.eventsphere.judge.dto.CriterionScoreResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeEvaluationResponse;
import com.vansh.eventsphere.eventsphere.judge.model.CriterionScore;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeEvaluation;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeCriterion;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class JudgeEvaluationMapper {

    public List<CriterionScore> toDomainScores(
            JudgeRound round,
            List<CriterionScoreRequest> requests
    ) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }

        Map<String, CriterionScoreRequest> requestsById =
                new HashMap<>();

        for (CriterionScoreRequest request : requests) {
            requestsById.put(
                    request.getCriteriaId(),
                    request
            );
        }

        /*
         * Store scores in rubric order, not client-supplied order.
         * Validation must run before this mapper is called.
         */
        return round.getCriteria()
                .stream()
                .filter(criterion ->
                        requestsById.containsKey(criterion.getId()))
                .map(criterion -> {
                    CriterionScoreRequest request =
                            requestsById.get(criterion.getId());

                    CriterionScore score = new CriterionScore();
                    score.setCriterionId(criterion.getId());
                    score.setScore(request.getScore());
                    score.setComment(
                            request.getComment() == null
                                    ? null
                                    : request.getComment().trim()
                    );

                    return score;
                })
                .toList();
    }

    public JudgeEvaluationResponse toResponse(
            JudgeEvaluation evaluation
    ) {
        List<CriterionScoreResponse> scoreResponses =
                evaluation.getScores() == null
                        ? List.of()
                        : evaluation.getScores()
                        .stream()
                        .map(score ->
                                CriterionScoreResponse.builder()
                                        .criterionId(
                                                score.getCriterionId()
                                        )
                                        .score(score.getScore())
                                        .comment(score.getComment())
                                        .build()
                        )
                        .toList();

        return JudgeEvaluationResponse.builder()
                .id(evaluation.getId())
                .roundId(evaluation.getRoundId())
                .activityId(evaluation.getActivityId())
                .registrationId(evaluation.getRegistrationId())
                .judgeId(evaluation.getJudgeId())
                .scores(scoreResponses)
                .totalScore(evaluation.getTotalScore())
                .feedback(evaluation.getFeedback())
                .status(evaluation.getStatus())
                .submittedAt(evaluation.getSubmittedAt())
                .createdAt(evaluation.getCreatedAt())
                .updatedAt(evaluation.getUpdatedAt())
                .build();
    }
}