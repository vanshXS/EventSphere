
package com.vansh.eventsphere.eventsphere.judge.dto;

import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class JudgeRoundResponse {

    private String id;
    private String activityId;
    private String name;
    private String description;
    private Integer sequence;
    private List<JudgeCriterionResponse> criteria;
    private JudgingRoundStatus status;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
