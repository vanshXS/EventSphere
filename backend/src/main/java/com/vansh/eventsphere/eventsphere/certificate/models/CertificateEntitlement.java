package com.vansh.eventsphere.eventsphere.certificate.models;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "certificate_entitlements")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateEntitlement {

    @Id
    private String id;

    private String recipientUserId;
    private CertificateType type;
    private CertificateScope scope;

    // The event ID for EVENT scope, or activity ID for ACTIVITY scope.
    private String scopeId;

    // The certificate currently reserved for this entitlement.
    private String currentCertificateId;

    private Instant updatedAt;

    @Version
    private Long version;
}