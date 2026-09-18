package com.vansh.eventsphere.eventsphere.event.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "event_registration")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventRegistration {

    @Id
    private String id;

    @Indexed
    private String eventId;

    @Indexed
    private String participantId;

    private RegistrationStatus status;
    private LocalDateTime registeredAt;
    private LocalDateTime cancelledAt;
}
