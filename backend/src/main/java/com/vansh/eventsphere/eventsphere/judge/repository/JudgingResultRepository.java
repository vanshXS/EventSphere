package com.vansh.eventsphere.eventsphere.judge.repository;

import com.vansh.eventsphere.eventsphere.judge.model.JudgingResult;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface JudgingResultRepository extends MongoRepository<JudgingResult, String> {

    Optional<JudgingResult> findByRoundId(String roundId);

    boolean existsByRoundId(String roundId);
}
