package com.vansh.eventsphere.eventsphere.certificate.dto;

import com.vansh.eventsphere.eventsphere.certificate.models.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

public final class CertificateApi {
    private CertificateApi() {}
    public record GenerateRequest(@NotNull CertificateType type, @NotBlank String registrationId,
                                  @NotBlank String participantId, String roundId) {}
    public record Candidate(String registrationId, String participantId, String name,
                            boolean eligible, String reason, String certificateStatus) {}
    public record Preview(String scopeName, String status, String finalRoundId,
                          int missingTeamSnapshots, List<Candidate> candidates) {}
    public record CertificateView(String id, String certificateNumber, CertificateType type,
                                  CertificateScope scope, CertificateStatus status,
                                  String scopeName, String teamName, Integer rank,
                                  Instant issuedAt, String sourceRoundId) {
        public static CertificateView of(Certificate c) {
            return new CertificateView(c.getId(), c.getCertificateNumber(), c.getType(), c.getScope(),
                    c.getStatus(), c.getScopeNameSnapshot(), c.getTeamName(), c.getRank(),
                    c.getIssuedAt(), c.getSourceRoundId());
        }
    }
    public record VerifyResponse(String status) {}
}
