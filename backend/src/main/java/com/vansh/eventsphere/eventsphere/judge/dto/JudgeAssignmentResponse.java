package com.vansh.eventsphere.eventsphere.judge.dto;

import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class JudgeAssignmentResponse {

    private String id;
    private String roundId;
    private String judgeId;
    private String assignedBy;
    private JudgeAssignmentStatus status;
    private LocalDateTime assignedAt;
    private LocalDateTime revokedAt;
}
