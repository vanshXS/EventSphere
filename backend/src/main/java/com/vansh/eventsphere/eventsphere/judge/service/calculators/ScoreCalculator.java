package com.vansh.eventsphere.eventsphere.judge.service.calculators;

import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.judge.model.CriterionScore;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeCriterion;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class ScoreCalculator {

    private static final BigDecimal REQUIRED_WEIGHT_TOTAL =
            new BigDecimal("100");

    private static final int CALCULATION_SCALE = 8;
    private static final int RESULT_SCALE = 2;

    public BigDecimal calculateWeightedTotal(
            JudgeRound round,
            List<CriterionScore> scores
    ) {
        if (round == null
                || round.getCriteria() == null
                || round.getCriteria().isEmpty()) {
            throw new BadRequestException(
                    "A configured judging rubric is required."
            );
        }

        if (scores == null
                || scores.size() != round.getCriteria().size()) {
            throw new BadRequestException(
                    "A complete set of criterion scores is required."
            );
        }

        Map<String, CriterionScore> scoresByCriterion = new HashMap<>();

        for (CriterionScore score : scores) {
            if (score == null
                    || score.getCriterionId() == null
                    || score.getCriterionId().isBlank()
                    || score.getScore() == null) {
                throw new BadRequestException(
                        "One or more criterion scores are invalid."
                );
            }

            if (scoresByCriterion.putIfAbsent(
                    score.getCriterionId(),
                    score
            ) != null) {
                throw new BadRequestException(
                        "A criterion cannot be scored more than once."
                );
            }
        }

        BigDecimal totalWeight = BigDecimal.ZERO;
        BigDecimal totalScore = BigDecimal.ZERO;

        for (JudgeCriterion criterion : round.getCriteria()) {
            if (criterion == null
                    || criterion.getId() == null
                    || criterion.getMaxScore() == null
                    || criterion.getWeight() == null
                    || criterion.getMaxScore().compareTo(
                    BigDecimal.ZERO
            ) <= 0
                    || criterion.getWeight().compareTo(
                    BigDecimal.ZERO
            ) <= 0) {
                throw new BadRequestException(
                        "The judging rubric contains invalid scoring values."
                );
            }

            totalWeight = totalWeight.add(criterion.getWeight());

            CriterionScore submitted =
                    scoresByCriterion.get(criterion.getId());

            if (submitted == null) {
                throw new BadRequestException(
                        "A required criterion score is missing."
                );
            }

            BigDecimal score = submitted.getScore();

            if (score.compareTo(BigDecimal.ZERO) < 0
                    || score.compareTo(criterion.getMaxScore()) > 0) {
                throw new BadRequestException(
                        "A criterion score is outside its allowed range."
                );
            }

            BigDecimal contribution = score
                    .divide(
                            criterion.getMaxScore(),
                            CALCULATION_SCALE,
                            RoundingMode.HALF_UP
                    )
                    .multiply(criterion.getWeight());

            totalScore = totalScore.add(contribution);
        }

        if (totalWeight.compareTo(REQUIRED_WEIGHT_TOTAL) != 0) {
            throw new BadRequestException(
                    "Judging criterion weights must total 100."
            );
        }

        return totalScore.setScale(
                RESULT_SCALE,
                RoundingMode.HALF_UP
        );
    }
}