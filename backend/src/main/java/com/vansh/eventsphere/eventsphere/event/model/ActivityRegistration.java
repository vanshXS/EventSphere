package com.vansh.eventsphere.eventsphere.event.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "activity_registration")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ActivityRegistration {

    @Id
    private String id;

    @Indexed
    private String activityId;

    private String eventId;

    @Indexed
    private String participantId;

    private String teamId;

    /**
     * Team roster captured when the registration was submitted.
     * Later changes to the Team do not affect this list.
     * Null for individual registrations and for rows created before snapshots existed.
     */
    @Indexed
    private List<String> teamMemberIds;

    /** Team leader at submission time. Only this participant may cancel. */
    private String teamLeaderId;

    private RegistrationStatus status;
    private RegistrationType registrationType;
    private LocalDateTime registeredAt;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private String reviewNote;

    // Backward compatibility aliases for MongoDB document field variations
    public String getReviewBy() {
        return reviewedBy;
    }

    public void setReviewBy(String reviewBy) {
        if (this.reviewedBy == null) {
            this.reviewedBy = reviewBy;
        }
    }

    public LocalDateTime getReviewAt() {
        return reviewedAt;
    }

    public void setReviewAt(LocalDateTime reviewAt) {
        if (this.reviewedAt == null) {
            this.reviewedAt = reviewAt;
        }
    }
}
