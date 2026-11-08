package com.vansh.eventsphere.eventsphere.college.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.vansh.eventsphere.eventsphere.college.model.CollegeAffiliationRequest;

public interface CollegeAffiliationRequestRepository extends MongoRepository<CollegeAffiliationRequest, String> {

    List<CollegeAffiliationRequest> findByParticipantId(String participantId);

    List<CollegeAffiliationRequest> findByCollegeId(String collegeId);

    List<CollegeAffiliationRequest> findByCollegeIdAndStatus(String collegeId, String status);

    Optional<CollegeAffiliationRequest> findByParticipantIdAndCollegeIdAndStatusIn(String participantId, String collegeId, List<String> statuses);

    Optional<CollegeAffiliationRequest> findByParticipantIdAndCollegeIdAndStatus(String participantId, String collegeId, String status);

    long countByParticipantIdAndCollegeIdAndStatusIn(String participantId, String collegeId, List<String> statuses);
}