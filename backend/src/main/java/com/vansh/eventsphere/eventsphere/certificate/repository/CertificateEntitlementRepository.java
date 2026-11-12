package com.vansh.eventsphere.eventsphere.certificate.repository;

import com.vansh.eventsphere.eventsphere.certificate.models.CertificateEntitlement;
import com.vansh.eventsphere.eventsphere.certificate.models.CertificateScope;
import com.vansh.eventsphere.eventsphere.certificate.models.CertificateType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CertificateEntitlementRepository extends MongoRepository<CertificateEntitlement, String> {

    Optional<CertificateEntitlement>
    findByRecipientUserIdAndTypeAndScopeAndScopeId(
            String recipientUserId,
            CertificateType type,
            CertificateScope scope,
            String scopeId
    );
}
