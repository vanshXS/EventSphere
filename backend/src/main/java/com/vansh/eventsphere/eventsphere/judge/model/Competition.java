package com.vansh.eventsphere.eventsphere.judge.model;

import com.vansh.eventsphere.eventsphere.judge.model.enums.CompetitionMode;
import com.vansh.eventsphere.eventsphere.judge.model.enums.RankingPolicy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@AllArgsConstructor @NoArgsConstructor
@Builder
@Document(collection = "competitions")
@CompoundIndex(
        name = "uq_competition_activity",
        def = "{'activityId': 1}",
        unique = true
)
public class Competition {

    @Id
    private String id;
    private String activityId;
    private String organizerId;
    private boolean judgingEnabled;

    private CompetitionMode competitionMode;
    private RankingPolicy rankingPolicy;

    private Instant createdAt;
    private Instant updatedAt;
}
