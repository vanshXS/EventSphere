package com.vansh.eventsphere.eventsphere.judge.dto;

import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.RankingPolicy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor @NoArgsConstructor
@Builder
public class JudgeResultsResponse {

    private String roundId;
    private String activityId;

    private String roundName;
    private Integer sequence;

    private JudgingRoundStatus status;
    private RankingPolicy rankingPolicy;
    private LocalDateTime publishedAt;

    private List<JudgingResultEntryResponse> entries;
}
