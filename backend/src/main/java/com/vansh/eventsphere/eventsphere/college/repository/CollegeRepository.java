package com.vansh.eventsphere.eventsphere.college.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.vansh.eventsphere.eventsphere.college.model.College;

public interface CollegeRepository extends MongoRepository<College, String> {

    Optional<College> findByCode(String code);
    boolean existsByCode(String code);

    List<College> findByNameContainingIgnoreCase(String name);
    List<College> findByNameContainingIgnoreCaseOrCodeContainingIgnoreCase(String name, String code);

}
