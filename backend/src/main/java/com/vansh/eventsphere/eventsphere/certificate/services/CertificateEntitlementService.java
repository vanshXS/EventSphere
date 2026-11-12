package com.vansh.eventsphere.eventsphere.certificate.services;

import com.mongodb.DuplicateKeyException;
import com.vansh.eventsphere.eventsphere.certificate.dto.ReservationResult;
import com.vansh.eventsphere.eventsphere.certificate.models.CertificateEntitlement;
import com.vansh.eventsphere.eventsphere.certificate.models.CertificateScope;
import com.vansh.eventsphere.eventsphere.certificate.models.CertificateType;
import com.vansh.eventsphere.eventsphere.certificate.repository.CertificateEntitlementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CertificateEntitlementService {

    private final CertificateEntitlementRepository repository;

    public ReservationResult reserve(
            String recipientUserId,
            CertificateType type,
            CertificateScope scope,
            String scopeId
    ) {
        validate(recipientUserId, type, scope, scopeId);

        CertificateEntitlement entitlement = CertificateEntitlement.builder()
                .id(UUID.randomUUID().toString())
                .recipientUserId(recipientUserId)
                .type(type)
                .scope(scope)
                .scopeId(scopeId)
                .currentCertificateId(UUID.randomUUID().toString())
                .updatedAt(Instant.now())
                .build();

        try {
            CertificateEntitlement created = repository.insert(entitlement);
            return new ReservationResult(true, created);
        } catch (DuplicateKeyException duplicate) {
            CertificateEntitlement existing =
                    repository.findByRecipientUserIdAndTypeAndScopeAndScopeId(
                            recipientUserId,
                            type,
                            scope,
                            scopeId
                    ).orElseThrow(() -> duplicate);

            return new ReservationResult(false, existing);
        }
    }

    private void validate(
            String recipientUserId,
            CertificateType type,
            CertificateScope scope,
            String scopeId
    ) {
        if (recipientUserId == null || recipientUserId.isBlank()) {
            throw new IllegalArgumentException("Recipient is required");
        }

        if (type == null || scope == null) {
            throw new IllegalArgumentException("Type and scope are required");
        }

        if (scopeId == null || scopeId.isBlank()) {
            throw new IllegalArgumentException("Scope ID is required");
        }

        if (type == CertificateType.WINNER
                && scope != CertificateScope.ACTIVITY) {
            throw new IllegalArgumentException(
                    "Winner certificates must belong to an activity"
            );
        }
    }
}
