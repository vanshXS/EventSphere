package com.vansh.eventsphere.eventsphere.judge.dto;


import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor @NoArgsConstructor
@Builder
public class JudgeAssignedRoundResponse {

    private String assignmentId;
    private String roundId;

    private String activityId;
    private String activityName;
    private String eventId;

    private String roundName;
    private String description;
    private Integer sequence;
    private LocalDateTime scheduledStartDateTime;
    private LocalDateTime scheduledEndDateTime;
    private String scheduledTimeZoneId;
    private LocalDateTime activityActualStartDateTime;

    private JudgingRoundStatus status;
    private boolean canEvaluate;

    private List<JudgeCriterionResponse> criteria;

    private LocalDateTime assignedAt;
    private LocalDateTime openedAt;
    private LocalDateTime closedAt;
    private LocalDateTime publishedAt;

}
