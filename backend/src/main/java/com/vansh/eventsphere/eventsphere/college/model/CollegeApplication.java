package com.vansh.eventsphere.eventsphere.college.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "college_applications")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CollegeApplication {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String code;

    private String officialWebsite;

    private String address;

    private CollegeVerificationMode verificationMode;

    private String proposedDomain;

    private String domainContactEmail;

    private String initialAdminEmail;

    private CollegeVerificationStatus verificationStatus;

    private LocalDateTime submittedAt;

    private String submittedByEmail;

    private String domainVerificationToken;

    private LocalDateTime domainOwnershipVerifiedAt;

    private String reviewedBy;

    private LocalDateTime reviewedAt;

    private String rejectionReason;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}