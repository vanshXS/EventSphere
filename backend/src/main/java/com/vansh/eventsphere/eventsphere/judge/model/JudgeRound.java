package com.vansh.eventsphere.eventsphere.judge.model;


import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "judge_rounds")
@CompoundIndex(
        name = "activity_round_sequence_unique",
        def = "{'activityId': 1, 'sequence': 1}",
        unique = true
)
@Data
@AllArgsConstructor @NoArgsConstructor
@Builder
public class JudgeRound {

    @Id
    private String id;

    @Indexed
    private String activityId;

    private String name;

    private String description;

    private LocalDateTime scheduledStartDateTime;
    private LocalDateTime scheduledEndDateTime;
    private String scheduledTimeZoneId;

    private Integer sequence;

    @Builder.Default
    private List<JudgeCriterion> criteria = new ArrayList<>();

    @Builder.Default
    private JudgingRoundStatus status = JudgingRoundStatus.DRAFT;

    private String createdBy;

    private LocalDateTime openedAt;
    private LocalDateTime closedAt;
    private LocalDateTime publishedAt;
    private String publishedBy;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;


}
