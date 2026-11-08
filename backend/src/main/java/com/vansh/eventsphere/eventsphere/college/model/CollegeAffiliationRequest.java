package com.vansh.eventsphere.eventsphere.college.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "college_affiliation_requests")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CollegeAffiliationRequest {

    @Id
    private String id;

    @Indexed
    private String participantId;

    @Indexed
    private String collegeId;

    private String studentIdentifier;

    private String course;

    private String department;

    private String supportingDocumentId;

    private String status;

    private LocalDateTime submittedAt;

    private String reviewedBy;

    private LocalDateTime reviewedAt;

    private String rejectionReason;
}