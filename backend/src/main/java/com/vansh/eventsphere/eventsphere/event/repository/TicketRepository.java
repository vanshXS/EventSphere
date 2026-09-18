package com.vansh.eventsphere.eventsphere.event.repository;

import com.vansh.eventsphere.eventsphere.event.model.Ticket;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TicketRepository extends MongoRepository<Ticket, String> {

    Optional<Ticket> findByRegistrationId(String registrationId);

    Optional<Ticket> findByIdAndActiveTrue(String id);
}
