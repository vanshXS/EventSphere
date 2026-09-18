package com.vansh.eventsphere.eventsphere.event.dto;

import com.vansh.eventsphere.eventsphere.event.model.TicketScope;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketResponse {

    private String ticketId;
    private TicketScope scope;
    private String registrationId;
    private String eventId;
    private String activityId;
    private String participantId;
    private String qrPayload;
    private LocalDateTime issuedAt;
}
