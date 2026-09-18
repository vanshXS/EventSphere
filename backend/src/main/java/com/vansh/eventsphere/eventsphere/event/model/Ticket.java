package com.vansh.eventsphere.eventsphere.event.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@CompoundIndex(
        name = "registration_holder_ticket_idx",
        def = "{'registrationId': 1, 'holderParticipantId': 1}",
        unique = true
)
@Document(collection = "tickets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {

    @Id
    private String id;

    @Indexed
    private String registrationId;

    @Indexed
    private String eventId;

    @Indexed
    private String activityId;

    /**
     * Participant represented by this ticket.
     * For team registrations every member gets their own ticket.
     */
    @Indexed
    private String holderParticipantId;

    private TicketScope scope;
    private String nonce;
    private boolean active;
    private LocalDateTime issuedAt;
    private LocalDateTime revokedAt;

    /** Internal coordination field used by TransactionRunner. */
    private long revision;
}
