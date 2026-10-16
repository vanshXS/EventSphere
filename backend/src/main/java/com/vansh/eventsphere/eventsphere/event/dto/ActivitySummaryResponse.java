package com.vansh.eventsphere.eventsphere.event.dto;

import java.time.LocalDateTime;

import com.vansh.eventsphere.eventsphere.event.model.ActivityType;
import com.vansh.eventsphere.eventsphere.event.model.EventStatus;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivitySummaryResponse {
    private String id;
    private String eventId;
    private String name;
    private String description;
    private ActivityType type;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private LocalDateTime actualStartDateTime;
    private LocalDateTime actualEndDateTime;
    private LocalDateTime registrationDeadline;
    private String location;
    private Integer capacity;
    private RegistrationType registrationType;
    private Integer minTeamSize;
    private Integer maxTeamSize;
    private Boolean requiresApproval;
    private EventStatus status;

    // Summary metrics
    private long totalRegistrations;
    private long approvedRegistrations;
    private long pendingApprovalCount;
    private long rejectedRegistrations;
    private long attendanceCount;
    private double turnoutRate;
}
