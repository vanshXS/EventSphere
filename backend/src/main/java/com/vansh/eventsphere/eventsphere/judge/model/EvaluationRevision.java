package com.vansh.eventsphere.eventsphere.judge.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor @NoArgsConstructor
@Builder
public class EvaluationRevision{

    private Integer revisionNumber;
    private List<CriterionScore> scores;
    private BigDecimal totalScore;
    private String feedback;
    private String changedBy;

    private LocalDateTime createdAt;

    private String correctionReason;

}
