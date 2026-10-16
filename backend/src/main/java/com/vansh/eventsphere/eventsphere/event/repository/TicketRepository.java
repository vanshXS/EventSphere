package com.vansh.eventsphere.eventsphere.event.repository;

import com.vansh.eventsphere.eventsphere.event.model.Ticket;
import com.vansh.eventsphere.eventsphere.event.model.TicketScope;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends MongoRepository<Ticket, String> {

    Optional<Ticket> findByRegistrationIdAndHolderParticipantId(
            String registrationId,
            String holderParticipantId
    );

    List<Ticket> findByRegistrationId(String registrationId);


    Optional<Ticket> findByEventIdAndHolderParticipantIdAndScope(
            String eventId,
            String holderParticipantId,
            TicketScope scope
    );


}
