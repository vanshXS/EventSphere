package com.vansh.eventsphere.eventsphere.college.dto;

import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationMode;
import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationStatus;

import lombok.Data;

@Data
public class CollegeApplicationResponse {

    private String id;
    private String name;
    private String code;
    private String officialWebsite;
    private String address;
    private CollegeVerificationMode verificationMode;
    private String proposedDomain;
    private String domainContactEmail;
    private String initialAdminEmail;
    private CollegeVerificationStatus verificationStatus;
    private String submittedByEmail;
    private String domainOwnershipVerifiedAt;
    private boolean domainOwnershipVerified;
    private String reviewedBy;
    private String reviewedAt;
    private String rejectionReason;
    private String submittedAt;
    private String createdAt;
    private String updatedAt;
}