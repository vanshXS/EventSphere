package com.vansh.eventsphere.eventsphere.college.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.vansh.eventsphere.eventsphere.college.model.OTPChallenge;

public interface OTPChallengeRepository extends MongoRepository<OTPChallenge, String> {

    Optional<OTPChallenge> findFirstByTargetIdAndEmailAndPurposeOrderByCreatedAtDesc(
            String targetId, String email, String purpose);

    void deleteByTargetIdAndEmailAndPurpose(String targetId, String email, String purpose);
}