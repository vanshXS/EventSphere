package com.vansh.eventsphere.eventsphere.judge.repository;

import com.vansh.eventsphere.eventsphere.judge.model.Competition;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface CompetitionRepository extends MongoRepository<Competition, String> {

    Optional<Competition> findByActivityId(String activityId);

    boolean existsByActivityId(String activityId);
}
