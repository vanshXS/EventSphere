package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.college.model.College;
import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationMode;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeRepository;
import com.vansh.eventsphere.eventsphere.event.model.EventVisibility;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrganizerAffiliationPolicyTest {
    @Test void manualCollegeRequiresApprovalOnlyForCampusPublishing() {
        UserRepository users = mock(UserRepository.class);
        CollegeRepository colleges = mock(CollegeRepository.class);
        var policy = new OrganizerAffiliationPolicy(users, colleges);
        var organizer = User.builder().userId("u").collegeId("c").organizerAffiliationStatus("PENDING").build();
        when(users.findById("u")).thenReturn(Optional.of(organizer));
        when(colleges.findById("c")).thenReturn(Optional.of(College.builder().verificationMode(CollegeVerificationMode.MANUAL_DOCUMENTS).build()));
        assertDoesNotThrow(() -> policy.verifyCampusPublishing("u", EventVisibility.OPEN_TO_ALL));
        assertThrows(BadRequestException.class, () -> policy.verifyCampusPublishing("u", EventVisibility.COLLEGE_ONLY));
        organizer.setOrganizerAffiliationStatus("VERIFIED");
        assertDoesNotThrow(() -> policy.verifyCampusPublishing("u", EventVisibility.COLLEGE_ONLY));
    }
}
