package com.vansh.eventsphere.eventsphere.event.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "event_staff_assignments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventStaffAssignment {

    @Id
    private String id;

    @Indexed
    private String eventId;

    @Indexed
    private String activityId;

    @Indexed
    private String organizerId;

    @Indexed
    private String userId;

    @Indexed
    private String email;

    private String invitedName;
    private EventStaffPermission permission;
    private EventStaffStatus status;

    /** SHA-256 of the one-time invitation token. */
    private String invitationTokenHash;

    private LocalDateTime invitationExpiresAt;
    private LocalDateTime invitedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime revokedAt;
}
