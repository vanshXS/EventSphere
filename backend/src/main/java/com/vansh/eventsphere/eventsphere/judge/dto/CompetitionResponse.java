package com.vansh.eventsphere.eventsphere.judge.dto;

import com.vansh.eventsphere.eventsphere.judge.model.enums.CompetitionMode;
import com.vansh.eventsphere.eventsphere.judge.model.enums.RankingPolicy;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class CompetitionResponse {

    private String id;
    private String activityId;
    private String organizerId;
    private boolean judgingEnabled;
    private CompetitionMode competitionMode;
    private RankingPolicy rankingPolicy;
    private Instant createdAt;
    private Instant updatedAt;
}
