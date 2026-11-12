package com.vansh.eventsphere.eventsphere.certificate.dto;

import com.vansh.eventsphere.eventsphere.certificate.models.Reason;

public record EligibilityResult(
        boolean eligible,
        Reason reason,
        String registrationId,
        String attendanceId
) {

    public static EligibilityResult ineligible(Reason reason) {
        return new EligibilityResult(false, reason, null, null);
    }
}
