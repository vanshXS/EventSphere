package com.vansh.eventsphere.eventsphere.college.model;

import java.time.LocalDateTime;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A staff/organizer verification record.  It is intentionally not a student record. */
@Document(collection = "organizer_affiliation_requests")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrganizerAffiliationRequest {
    @Id private String id;
    @Indexed private String organizerId;
    @Indexed private String collegeId;
    private String staffIdentifier;
    private String department;
    private String designation;
    private StoredDocument supportingDocument;
    private String status;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private String reviewedBy;
    private String rejectionReason;
    private LocalDateTime updatedAt;
}
