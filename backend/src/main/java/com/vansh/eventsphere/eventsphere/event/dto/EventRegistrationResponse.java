package com.vansh.eventsphere.eventsphere.event.dto;

import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventRegistrationResponse {

    private String id;
    private String eventId;
    private String eventName;
    private String participantId;
    private RegistrationStatus status;
    private LocalDateTime registeredAt;
    private LocalDateTime cancelledAt;
    private TicketResponse ticket;
}
