package com.vansh.eventsphere.eventsphere.event.dto;

import com.vansh.eventsphere.eventsphere.event.model.CheckInType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceResponse {

    private String attendanceId;
    private String ticketId;
    private String registrationId;
    private String eventId;
    private String eventName;
    private String activityId;
    private String activityName;
    private String participantId;
    private String participantName;
    private CheckInType checkInType;
    private String checkedInBy;
    private LocalDateTime checkedInAt;
    private boolean alreadyCheckedIn;
}
