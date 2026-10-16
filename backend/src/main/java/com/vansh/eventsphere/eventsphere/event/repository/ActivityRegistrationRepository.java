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

    /** Registrations belonging to teams the participant currently belongs to. */
    List<ActivityRegistration> findByTeamIdIn(List<String> teamIds);
    long countByActivityIdAndStatus(
            String activityId,
            RegistrationStatus status
    );
    boolean existsByActivityIdAndTeamIdAndStatus(
            String activityId,
            String teamId,
            RegistrationStatus status
    );

    boolean existsByActivityIdAndParticipantIdAndStatusIn(
            String activityId,
            String participantId,
            List<RegistrationStatus> statuses
    );

    boolean existsByActivityIdAndTeamIdAndStatusIn(
            String activityId,
            String teamId,
            List<RegistrationStatus> statuses
    );

    long countByActivityIdAndStatusIn(
            String activityId,
            List<RegistrationStatus> statuses
    );

    /** Registrations a participant submitted, plus team entries they were part of. */
    List<ActivityRegistration> findByParticipantIdOrTeamMemberIdsContaining(
            String participantId,
            String memberId
    );

    /** Any of these people already hold an individual entry for this activity. */
    boolean existsByActivityIdAndStatusInAndParticipantIdIn(
            String activityId,
            List<RegistrationStatus> statuses,
            List<String> participantIds
    );

    /** Any of these people are already inside a team entry for this activity. */
    boolean existsByActivityIdAndStatusInAndTeamMemberIdsIn(
            String activityId,
            List<RegistrationStatus> statuses,
            List<String> memberIds
    );

}
