package com.vansh.eventsphere.eventsphere.college.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import com.vansh.eventsphere.eventsphere.college.model.CollegeApplication;
import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationStatus;

public interface CollegeApplicationRepository extends MongoRepository<CollegeApplication, String> {

    Optional<CollegeApplication> findByCode(String code);

    boolean existsByCode(String code);

    // Non-paginated — used internally
    List<CollegeApplication> findByVerificationStatus(CollegeVerificationStatus status);

    // Paginated — used by Super Admin listing endpoint
    Page<CollegeApplication> findByVerificationStatus(CollegeVerificationStatus status, Pageable pageable);

    List<CollegeApplication> findByVerificationStatusIn(List<CollegeVerificationStatus> statuses);

    Optional<CollegeApplication> findByProposedDomain(String domain);
}