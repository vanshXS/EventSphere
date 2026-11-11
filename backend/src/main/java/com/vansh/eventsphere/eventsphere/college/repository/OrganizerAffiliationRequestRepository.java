package com.vansh.eventsphere.eventsphere.college.repository;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import com.vansh.eventsphere.eventsphere.college.model.OrganizerAffiliationRequest;

public interface OrganizerAffiliationRequestRepository extends MongoRepository<OrganizerAffiliationRequest, String> {
    List<OrganizerAffiliationRequest> findByCollegeId(String collegeId);
    List<OrganizerAffiliationRequest> findByOrganizerId(String organizerId);
    long countByOrganizerIdAndCollegeIdAndStatusIn(String organizerId, String collegeId, List<String> statuses);
}
