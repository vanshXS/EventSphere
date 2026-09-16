package com.vansh.eventsphere.eventsphere.college.services;

import com.vansh.eventsphere.eventsphere.college.model.College;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CollegeService {

    private final CollegeRepository collegeRepository;


    public College createCollege(College college) {

        log.info("Creating College {}", college);
        if(collegeRepository.existsByCode(college.getCode())){
            log.error("College code already exists.");
            throw new RuntimeException("College code already exists.");

        }

        return collegeRepository.save(college);
    }

    public College getCollegeById(String id) {
        return collegeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("College not found with id: " + id));
    }

    public List<College> searchCollege(String query) {

        log.info("Searching for College {}", query);
        return collegeRepository
                .findByNameContainingIgnoreCaseOrCodeContainingIgnoreCase(query, query);
    }
}
