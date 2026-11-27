package com.vansh.eventsphere.eventsphere.certificate.dto;

import com.vansh.eventsphere.eventsphere.certificate.models.CertificateEntitlement;

public record ReservationResult(boolean created, CertificateEntitlement entitlement) {
}
