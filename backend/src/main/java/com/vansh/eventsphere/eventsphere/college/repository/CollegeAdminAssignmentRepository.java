package com.vansh.eventsphere.eventsphere.college.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.vansh.eventsphere.eventsphere.college.model.CollegeAdminAssignment;
import com.vansh.eventsphere.eventsphere.college.model.CollegeAdminAssignmentStatus;

public interface CollegeAdminAssignmentRepository extends MongoRepository<CollegeAdminAssignment, String> {

    Optional<CollegeAdminAssignment> findByUserIdAndCollegeIdAndStatus(String userId, String collegeId, CollegeAdminAssignmentStatus status);

    List<CollegeAdminAssignment> findByUserId(String userId);

    List<CollegeAdminAssignment> findByCollegeId(String collegeId);

    List<CollegeAdminAssignment> findByCollegeIdAndStatus(String collegeId, CollegeAdminAssignmentStatus status);

    Optional<CollegeAdminAssignment> findByUserIdAndStatus(String userId, CollegeAdminAssignmentStatus status);
}