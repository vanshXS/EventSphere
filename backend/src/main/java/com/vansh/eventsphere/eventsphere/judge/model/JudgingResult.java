package com.vansh.eventsphere.eventsphere.judge.model;

import com.vansh.eventsphere.eventsphere.judge.model.enums.RankingPolicy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "judging_results")
@CompoundIndex(
        name = "uq_judging_result_round",
        def = "{'roundId': 1}",
        unique = true
)
@Data
@AllArgsConstructor @NoArgsConstructor
@Builder
public class JudgingResult {

    @Id
    private String id;

    private String roundId;
    private String activityId;
    private RankingPolicy rankingPolicy;

    private List<JudgingResultEntry> entries;

    private String publishedBy;
    private LocalDateTime publishedAt;


}
