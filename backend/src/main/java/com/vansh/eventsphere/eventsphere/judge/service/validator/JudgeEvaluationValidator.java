package com.vansh.eventsphere.eventsphere.judge.service.validator;

import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.judge.dto.CriterionScoreRequest;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeCriterion;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class JudgeEvaluationValidator {

    public void validateScore(
            JudgeRound round,
            List<CriterionScoreRequest> requests,
            boolean requireComplete
    ) {

        if(round == null) throw new BadRequestException("Judging round is required.");

        List<JudgeCriterion> criteria = round.getCriteria();

        if(criteria == null || criteria.isEmpty()) {
            throw new BadRequestException(
                    "The judging round has no scoring criteria."
            );
        }
        Map<String, JudgeCriterion> criteriaById = new HashMap<>();

        for(JudgeCriterion criterion : criteria) {
            if(criterion == null
            || criterion.getId() == null
            || criterion.getId().isBlank()) {
                throw new BadRequestException(
                        "The round contains an invalid criterion."
                );
            }

            if(criterion.getMaxScore() == null
            || criterion.getMaxScore().compareTo(BigDecimal.ZERO) <= 0){
                throw new BadRequestException(
                        "Every criterion must have a positive maximum score."
                );
            }

            if(criterion.getWeight() == null
            || criterion.getWeight().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException(
                        "Every criterion must have a positive weight."
                );
            }

            if(criteriaById.putIfAbsent(
                    criterion.getId(),
                    criterion
            ) != null) {
                throw new BadRequestException(
                        "The round contains duplicate criterion IDs."
                );
            }
        }

        List<CriterionScoreRequest> safeRequests =
                requests == null ? List.of() : requests;

        if(safeRequests.size() > criteria.size()) {
            throw new BadRequestException(
                    "More score were supplied than the round has criteria."
            );
        }

        Map<String, CriterionScoreRequest> submittedByCriterion = new HashMap<>();

        for(CriterionScoreRequest request : safeRequests) {
            if(request == null
             || request.getCriteriaId() == null
            || request.getCriteriaId().isBlank()) {
                throw new BadRequestException(
                        "Every score must reference a criterion."
                );
            }

            String criterionId = request.getCriteriaId().trim();

            JudgeCriterion criterion = criteriaById.get(criterionId);

            if (criterion == null) {
                throw new BadRequestException(
                        "A submitted score references a criterion "
                                + "that does not belong to this round."
                );
            }

            if (request.getScore() == null) {
                throw new BadRequestException(
                        "A score value is required."
                );
            }

            if (request.getScore().compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException(
                        "Scores cannot be negative."
                );
            }

            if (request.getScore().compareTo(
                    criterion.getMaxScore()
            ) > 0) {
                throw new BadRequestException(
                        "Score exceeds the maximum for criterion: "
                                + criterion.getName()
                );
            }

            if (request.getComment() != null
                    && request.getComment().length() > 1000) {
                throw new BadRequestException(
                        "A criterion comment cannot exceed 1000 characters."
                );
            }

            if(submittedByCriterion.putIfAbsent(
                    criterionId,
                    request
            ) != null) {
                throw new BadRequestException(
                        "A criterion cannot scored more than once."
                );
            }
        }

        if(requireComplete
        && submittedByCriterion.size() != criteriaById.size()) {
            throw new BadRequestException(
                    "All criteria must be scored before submission."
            );
        }
    }
}
