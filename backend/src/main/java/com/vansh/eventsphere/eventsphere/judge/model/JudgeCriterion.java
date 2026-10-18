package com.vansh.eventsphere.eventsphere.judge.model;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Builder
@Data
public class JudgeCriterion {
    private String id;
    private String name;
    private String description;

    /**
     * Relative importance of this criterion.
     * The final scoring formula will be implemented in the service layer.
     */
    private BigDecimal weight;

    private BigDecimal maxScore;


}
