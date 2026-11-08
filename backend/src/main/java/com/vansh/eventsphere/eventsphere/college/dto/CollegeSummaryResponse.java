package com.vansh.eventsphere.eventsphere.college.dto;

import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationMode;
import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationStatus;

public record CollegeSummaryResponse(
        String id,
        String name,
        String code,
        CollegeVerificationMode verificationMode,
        CollegeVerificationStatus verificationStatus,
        java.util.List<String> verifiedDomains
) {
}