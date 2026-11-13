package com.vansh.eventsphere.eventsphere.certificate.models;

import java.time.Instant;
import java.time.LocalDate;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "certificates")
@Data 
@NoArgsConstructor @AllArgsConstructor 
@Builder 
public class Certificate {

    @Id
    private String id;

    // Public identifier used to verify the certificate.
    private String certificateNumber;

    // Identifies the award this certificate represents.
    private String entitlementId;

    private CertificateType type;
    private CertificateScope scope;
    private CertificateStatus status;

    // The recipient is the person receiving the certificate.
    private String recipientUserId;
    private String recipientName;

    private String eventId;
    private String activityId;
    private String registrationId;
    private String attendanceId;

    // Used when applicable, such as for a team winner.
    private String teamName;
    private Integer rank;
    private String sourceRoundId;

    private String issuedByUserId;
    private Instant createdAt;
    private Instant issuedAt;

    // A storage reference, not a publicly accessible URL.
    private String pdfStorageKey;
    private String pdfSha256;

    private Instant revokedAt;
    private String revocationReason;
    private String replacesCertificateId;

    private String scopeNameSnapshot;
    private LocalDate certificateDate;
    private String pdfTemplateVersion;

    // A short-lived lease prevents concurrent workers from publishing the same PDF.
    private String generationToken;
    private Instant generationLeaseUntil;
    private String failureMessage;
}