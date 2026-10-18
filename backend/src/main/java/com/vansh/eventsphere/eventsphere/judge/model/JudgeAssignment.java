package com.vansh.eventsphere.eventsphere.judge.model;

import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
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

import java.time.LocalDateTime;

@Document(collection = "judge_assignments")
@CompoundIndex(
        name = "round_judge_unique",
        def = "{'roundId': 1, 'judgeId': 1}",
        unique = true
)
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class JudgeAssignment {

    @Id
    private String id;

    @Indexed
    private String roundId;

    @Indexed
    private String judgeId;

    private String assignedBy;

    @Builder.Default
    private JudgeAssignmentStatus status = JudgeAssignmentStatus.ACTIVE;

    private LocalDateTime assignedAt;
    private LocalDateTime revokedBy;
    private LocalDateTime revokedAt;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

}
