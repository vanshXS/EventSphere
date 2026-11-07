package com.vansh.eventsphere.eventsphere.judge.repository;

import com.vansh.eventsphere.eventsphere.judge.model.JudgingResult;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface JudgingResultRepository extends MongoRepository<JudgingResult, String> {

    Optional<JudgingResult> findByRoundId(String roundId);

    List<JudgingResult> findByRoundIdIn(Collection<String> roundIds);

    boolean existsByRoundId(String roundId);
}
