package com.vansh.eventsphere.eventsphere.judge.repository;

import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface JudgingRoundRepository extends MongoRepository<JudgeRound, String> {

    List<JudgeRound> findByActivityIdOrderBySequenceAsc(String activityId);

    boolean existsByActivityIdAndSequence(
            String activityId,
            Integer sequence
    );
}
