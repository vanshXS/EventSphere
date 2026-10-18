package com.vansh.eventsphere.eventsphere.judge.model;

import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeEvaluationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "judge_evaluations")
@CompoundIndex(
        name = "round_registration_judge_unique",
        def = "{'roundId': 1, 'registrationId': 1, 'judgeId': 1}",
        unique = true
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JudgeEvaluation {

    @Id
    private String id;

    @Indexed
    private String roundId;

    @Indexed
    private String activityId;

    /**
     * ID of the existing ActivityRegistration document.
     * Works for both individual and team entries.
     */
    @Indexed
    private String registrationId;

    @Indexed
    private String judgeId;

    @Builder.Default
    private List<CriterionScore> scores = new ArrayList<>();

    /**
     * Calculated by the backend from the round rubric.
     * Never accept this as authoritative client input.
     */
    private BigDecimal totalScore;

    private String feedback;

    @Builder.Default
    private JudgeEvaluationStatus status = JudgeEvaluationStatus.DRAFT;

    private LocalDateTime submittedAt;

    /**
     * Correction permission granted by the organizer.
     */
    private String correctionAuthorizedBy;

    private LocalDateTime correctionAuthorizedAt;

    private LocalDateTime correctionExpiresAt;

    private String correctionAuthorizationReason;

    /**
     * Previous versions are preserved when a correction is saved.
     */
    @Builder.Default
    private List<EvaluationRevision> revisionHistory = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}

