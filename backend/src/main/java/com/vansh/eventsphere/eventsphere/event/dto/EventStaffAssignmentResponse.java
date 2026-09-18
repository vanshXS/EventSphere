package com.vansh.eventsphere.eventsphere.event.dto;

import com.vansh.eventsphere.eventsphere.event.model.EventStaffPermission;
import com.vansh.eventsphere.eventsphere.event.model.EventStaffStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventStaffAssignmentResponse {

    private String id;
    private String eventId;
    private String eventName;
    private String activityId;
    private String activityName;
    private String organizerId;
    private String userId;
    private String email;
    private String invitedName;
    private EventStaffPermission permission;
    private EventStaffStatus status;
    private LocalDateTime invitedAt;
    private LocalDateTime invitationExpiresAt;
    private LocalDateTime acceptedAt;
    private String invitationLink;
}
