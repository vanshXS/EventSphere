package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationMode;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeRepository;
import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Manual-college organizers can draft, but must be verified to publish campus-only events. */
@Service
@RequiredArgsConstructor
public class OrganizerAffiliationPolicy {
    private final UserRepository users;
    private final CollegeRepository colleges;

    public void verifyCampusPublishing(String organizerId, EventVisibility visibility) {
        if (visibility != EventVisibility.COLLEGE_ONLY) return;
        var user = users.findById(organizerId).orElseThrow(() -> new ResourceNotFoundException("Organizer not found"));
        if (user.getCollegeId() == null) throw new BadRequestException("A college is required for a campus-only event");
        var college = colleges.findById(user.getCollegeId()).orElseThrow(() -> new ResourceNotFoundException("College not found"));
        if (college.getVerificationMode() == CollegeVerificationMode.MANUAL_DOCUMENTS
                && !"VERIFIED".equals(user.getOrganizerAffiliationStatus())) {
            throw new BadRequestException("College administrator approval of your organizer affiliation is required to publish campus-only events.");
        }
    }
}
