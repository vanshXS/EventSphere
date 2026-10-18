package com.vansh.eventsphere.eventsphere.judge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CriterionScoreResponse {

    private String criterionId;
    private BigDecimal score;
    private String comment;
}
