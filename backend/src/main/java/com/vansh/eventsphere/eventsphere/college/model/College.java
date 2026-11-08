package com.vansh.eventsphere.eventsphere.college.model;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "college")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class College {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String code;

    private CollegeVerificationStatus verificationStatus;

    private CollegeVerificationMode verificationMode;

    private String proposedDomain;

    private List<String> verifiedDomains;

    private String domainContactEmail;

    private LocalDateTime domainOwnershipVerifiedAt;

    private String submittedByEmail;

    private LocalDateTime submittedAt;

    private String reviewedBy;

    private LocalDateTime reviewedAt;

    private String rejectionReason;

    private String initialAdminEmail;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}