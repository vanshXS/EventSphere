package com.vansh.eventsphere.eventsphere.event.dto;

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
public class OrganizerRegistrationResponse {

    private String id;
    private String activityId;
    private String eventId;

    // Participant details
    private String participantId;
    private String participantName;
    private String participantEmail;

    // Registration metadata
    private RegistrationType registrationType;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private String reviewNote;
    private RegistrationStatus status;
    private LocalDateTime registeredAt;

    // Team details (if team registration)
    private String teamId;
    private String teamName;
    private List<String> teamMemberIds;

    // Backward-compatible alias for reviewBy
    public String getReviewBy() {
        return reviewedBy;
    }

    public void setReviewBy(String reviewBy) {
        if (this.reviewedBy == null) {
            this.reviewedBy = reviewBy;
        }
    }
}
