package com.vansh.eventsphere.eventsphere.judge.repository;

import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;

public interface JudgingRoundRepository extends MongoRepository<JudgeRound, String> {

    List<JudgeRound> findByActivityIdOrderBySequenceAsc(String activityId);

    List<JudgeRound> findByActivityIdInAndStatus(
            Collection<String> activityIds,
            JudgingRoundStatus status
    );

    boolean existsByActivityIdAndSequence(
            String activityId,
            Integer sequence
    );
}
