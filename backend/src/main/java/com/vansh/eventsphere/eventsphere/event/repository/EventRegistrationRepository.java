package com.vansh.eventsphere.eventsphere.event.repository;

import com.vansh.eventsphere.eventsphere.event.model.EventRegistration;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventRegistrationRepository extends MongoRepository<EventRegistration, String> {

    boolean existsByEventIdAndParticipantIdAndStatusIn(
            String eventId,
            String participantId,
            List<RegistrationStatus> statuses
    );

    List<EventRegistration> findByParticipantId(String participantId);

    List<EventRegistration> findByEventId(String eventId);
}
