package com.vansh.eventsphere.eventsphere.judge.dto;

import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeEvaluationStatus;
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
public class JudgeEvaluationResponse {

    private String id;
    private String roundId;
    private String activityId;
    private String registrationId;
    private String judgeId;

    private List<CriterionScoreResponse> scores;
    private BigDecimal totalScore;
    private String feedback;

    private JudgeEvaluationStatus status;

    private LocalDateTime submittedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
