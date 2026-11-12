package com.vansh.eventsphere.eventsphere.certificate.repository;

import java.security.cert.Certificate;
import java.util.Optional;

import org.springframework.boot.data.autoconfigure.web.DataWebProperties.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.vansh.eventsphere.eventsphere.certificate.models.CertificateStatus;

@Repository 
public interface CertificateRepository extends MongoRepository<Certificate, String> {

    Optional<Certificate> findByCertificateNumber(String certificateNumber);

    Optional<Certificate> findByIdAndRecipientUserIdAndStatus(
            String id,
            String recipientUserId,
            CertificateStatus status
    );

    Page<Certificate> findByRecipientUserIdAndStatusOrderByIssuedAtDescIdDesc(
            String recipientUserId,
            CertificateStatus status,
            Pageable pageable
    );
}