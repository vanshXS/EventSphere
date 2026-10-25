package com.vansh.eventsphere.eventsphere.judge.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RoundClosurePreviewResponse {

    private int activeJudgeCount;
    private int eligibleEntryCount;
    private int requiredEvaluationCount;
    private int submittedEvaluationCount;
    private int missingEvaluationCount;
}
