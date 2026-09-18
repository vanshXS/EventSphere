package com.vansh.eventsphere.eventsphere.event.dto;

import com.vansh.eventsphere.eventsphere.event.model.ActivityType;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityRegistrationResponse {

    private String id;
    private String activityId;
    private String activityName;
    private ActivityType activityType;
    private String eventId;
    private String eventName;
    private String participantId;
    private RegistrationType registrationType;
    private String teamId;
    private String teamName;
    private List<String> teamMemberIds;
    private String teamLeaderId;
    private RegistrationStatus status;
    private LocalDateTime registeredAt;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private String location;
    private LocalDateTime reviewedAt;
    private String reviewNote;
    private TicketResponse ticket;
}
