package com.vansh.eventsphere.eventsphere.college.service;

import com.vansh.eventsphere.eventsphere.college.dto.CollegeSummaryResponse;
import com.vansh.eventsphere.eventsphere.college.model.College;
import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationStatus;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeRepository;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CollegeService {

    private final CollegeRepository collegeRepository;

    public CollegeSummaryResponse getCollegeById(String id) {

        College college = collegeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("College with id " + id + " not found."));

        if(college.getVerificationStatus() != CollegeVerificationStatus.VERIFIED){
            throw new ResourceNotFoundException("College not found");
        }
        return toSummary(college);
    }

    public List<CollegeSummaryResponse> searchCollege(String query) {

        if(query == null || query.isBlank()){
            return List.of();
        }

        String normalizedQuery = query.trim().toLowerCase(Locale.ROOT);

        return collegeRepository
                .findByVerificationStatus(CollegeVerificationStatus.VERIFIED)
                .stream()
                .filter(college -> {
                    String name = college.getName() == null ? "" : college.getName().toLowerCase(Locale.ROOT);

                    String code = college.getCode() == null ? "" : college.getCode().toLowerCase(Locale.ROOT);
                    return name.contains(normalizedQuery) || code.contains(normalizedQuery);
                })
                .map(this::toSummary)
                .toList();
    }

    private CollegeSummaryResponse toSummary(College college) {
        return new CollegeSummaryResponse(
                college.getId(),
                college.getName(),
                college.getCode(),
                college.getVerificationMode(),
                college.getVerificationStatus(),
                college.getVerifiedDomains() != null ? college.getVerifiedDomains() : java.util.List.of()
        );
    }
}
