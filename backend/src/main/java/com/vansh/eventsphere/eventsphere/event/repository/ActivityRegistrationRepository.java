package com.vansh.eventsphere.eventsphere.event.repository;

import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityRegistrationRepository extends MongoRepository<ActivityRegistration, String> {

    boolean existsByActivityIdAndParticipantIdAndStatus(String activityId, String participantId, RegistrationStatus status);
    List<ActivityRegistration> findByParticipantId(String participantId);
    List<ActivityRegistration> findByActivityId(String activityId);
    long countByActivityIdAndStatus(
            String activityId,
            RegistrationStatus status
    );
    boolean existsByActivityIdAndTeamIdAndStatus(
            String activityId,
            String teamId,
            RegistrationStatus status
    );

}
