
package com.vansh.eventsphere.eventsphere.judge.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class JudgeCriterionResponse {

    private String id;
    private String name;
    private String description;
    private BigDecimal maxScore;
    private BigDecimal weight;
}
