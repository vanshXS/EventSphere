package com.vansh.eventsphere.eventsphere.event.repository;

import com.vansh.eventsphere.eventsphere.event.model.Team;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends MongoRepository<Team, String> {

    List<Team> findByLeaderId(String leaderId);
    List<Team> findByMembersIdContaining(String userId);
    boolean existsByNameIgnoreCaseAndLeaderId(
            String name,
            String leaderId
    );

}
