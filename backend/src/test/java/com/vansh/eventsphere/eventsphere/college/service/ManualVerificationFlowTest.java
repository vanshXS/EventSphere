package com.vansh.eventsphere.eventsphere.college.service;

import com.vansh.eventsphere.eventsphere.college.dto.CollegeApplicationResponse;
import com.vansh.eventsphere.eventsphere.college.model.*;
import com.vansh.eventsphere.eventsphere.college.repository.*;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ManualVerificationFlowTest {
    @Mock CollegeApplicationRepository applications;
    @Mock CollegeRepository colleges;
    @Mock CollegeAdminAssignmentRepository assignments;
    @Mock CollegeAffiliationRequestRepository affiliations;
    @Mock OrganizerAffiliationRequestRepository organizers;
    @Mock CollegeAdminInvitationRepository invitations;
    @Mock UserRepository users;
    @Mock OTPService otp;
    @Mock EmailService email;
    @Mock DocumentStorageService documents;
    @Mock PasswordEncoder passwordEncoder;
    @InjectMocks CollegeVerificationService service;

    @BeforeEach void setup() { ReflectionTestUtils.setField(service, "frontendUrl", "https://example.com"); }

    @Test void manualApprovalRequiresNomination() {
        var app = CollegeApplication.builder().id("a").verificationMode(CollegeVerificationMode.MANUAL_DOCUMENTS)
                .verificationStatus(CollegeVerificationStatus.PENDING_VERIFICATION).supportingDocuments(List.of(StoredDocument.builder().build())).build();
        when(applications.findById("a")).thenReturn(Optional.of(app));
        assertThrows(BadRequestException.class, () -> service.approveApplication("a", "super"));
        verify(colleges, never()).save(any());
    }

    @Test void manualApprovalRequiresInstitutionDocuments() {
        var app = CollegeApplication.builder().id("a").verificationMode(CollegeVerificationMode.MANUAL_DOCUMENTS)
                .verificationStatus(CollegeVerificationStatus.PENDING_VERIFICATION).nomineeStatus("PENDING")
                .nomineeAuthorizationDocument(StoredDocument.builder().build()).build();
        when(applications.findById("a")).thenReturn(Optional.of(app));
        assertThrows(BadRequestException.class, () -> service.approveApplication("a", "super"));
        verify(colleges, never()).save(any());
    }

    @Test void approvalCreatesVerifiedCollegeAndEmailsSingleUseInvitation() {
        var app = CollegeApplication.builder().id("a").name("College").code("COL")
                .verificationMode(CollegeVerificationMode.MANUAL_DOCUMENTS)
                .verificationStatus(CollegeVerificationStatus.PENDING_VERIFICATION)
                .nomineeStatus("PENDING").initialAdminEmail("admin@example.com")
                .supportingDocuments(List.of(StoredDocument.builder().build())).nomineeAuthorizationDocument(StoredDocument.builder().build()).build();
        when(applications.findById("a")).thenReturn(Optional.of(app));
        when(colleges.save(any(College.class))).thenAnswer(i -> { College c = i.getArgument(0); c.setId("c"); return c; });
        when(applications.save(any(CollegeApplication.class))).thenAnswer(i -> i.getArgument(0));
        CollegeApplicationResponse result = service.approveApplication("a", "super");
        assertEquals(CollegeVerificationStatus.VERIFIED, result.getVerificationStatus());
        assertEquals("APPROVED", result.getNomineeStatus());
        verify(invitations).save(argThat(inv -> inv.getTokenHash() != null && inv.getCollegeId().equals("c") && inv.getAcceptedAt() == null));
        verify(email).sendCollegeAdminInvitation(eq("admin@example.com"), eq("College"), contains("/college-admin/accept?token="));
    }

    @Test void affiliationApprovalSeparatesRequestAndUserStatus() {
        var req = CollegeAffiliationRequest.builder().id("r").collegeId("c").participantId("p").status("PENDING").build();
        var assignment = CollegeAdminAssignment.builder().permissions(List.of("REVIEW_STUDENT_AFFILIATION")).build();
        var user = User.builder().userId("p").email("student@example.com").build();
        when(affiliations.findById("r")).thenReturn(Optional.of(req));
        when(assignments.findByUserIdAndCollegeIdAndStatus("admin", "c", CollegeAdminAssignmentStatus.ACTIVE)).thenReturn(Optional.of(assignment));
        when(users.findById("p")).thenReturn(Optional.of(user));
        service.approveAffiliationRequest("r", "admin");
        assertEquals("APPROVED", req.getStatus()); assertEquals("VERIFIED", user.getCollegeVerificationStatus());
    }

    @Test void statusRetrievalUsesLatestRequestForCurrentCollege() {
        var user = User.builder().userId("p").collegeId("c").build();
        var latest = CollegeAffiliationRequest.builder().status("PENDING").submittedAt(LocalDateTime.now()).build();
        when(users.findById("p")).thenReturn(Optional.of(user));
        when(affiliations.findFirstByParticipantIdAndCollegeIdOrderBySubmittedAtDesc("p", "c")).thenReturn(Optional.of(latest));
        assertSame(latest, service.getMyAffiliationRequest("p"));
    }

    @Test void adminCannotReadStudentDocumentWithoutDocumentPermission() {
        var req = CollegeAffiliationRequest.builder().id("r").collegeId("c").supportingDocumentStorageName("id.pdf").build();
        when(affiliations.findById("r")).thenReturn(Optional.of(req));
        when(assignments.findByUserIdAndCollegeIdAndStatus("admin", "c", CollegeAdminAssignmentStatus.ACTIVE))
                .thenReturn(Optional.of(CollegeAdminAssignment.builder().permissions(List.of("REVIEW_STUDENT_AFFILIATION")).build()));
        assertThrows(BadRequestException.class, () -> service.getAffiliationRequestForDocument("r", "admin"));
    }

    @Test void validInvitationCreatesCollegeAdminAndCannotBeReused() {
        var invitation = CollegeAdminInvitation.builder().applicationId("a").collegeId("c").nomineeEmail("dean@example.com")
                .expiresAt(LocalDateTime.now().plusDays(1)).build();
        var app = CollegeApplication.builder().id("a").nomineeName("Dean").build();
        when(invitations.findByTokenHash(anyString())).thenReturn(Optional.of(invitation));
        when(applications.findById("a")).thenReturn(Optional.of(app));
        when(passwordEncoder.encode("secretpass")).thenReturn("encoded");
        when(users.save(any(User.class))).thenAnswer(i -> { User u = i.getArgument(0); u.setUserId("new-admin"); return u; });
        service.acceptCollegeAdminInvitation("token", "secretpass");
        assertNotNull(invitation.getAcceptedAt());
        verify(users).save(argThat(u -> u.getRole() == Role.COLLEGE_ADMIN && u.getCollegeId().equals("c") && u.getName().equals("Dean")));
        verify(assignments).save(argThat(a -> a.getPermissions().containsAll(List.of("REVIEW_STUDENT_AFFILIATION", "REVIEW_ORGANIZER_AFFILIATION", "VIEW_AFFILIATION_DOCUMENTS"))));
        assertThrows(BadRequestException.class, () -> service.acceptCollegeAdminInvitation("token", "secretpass"));
    }

    @Test void expiredInvitationCannotCreateAccount() {
        var invitation = CollegeAdminInvitation.builder().expiresAt(LocalDateTime.now().minusMinutes(1)).build();
        when(invitations.findByTokenHash(anyString())).thenReturn(Optional.of(invitation));
        assertThrows(BadRequestException.class, () -> service.acceptCollegeAdminInvitation("expired", "secretpass"));
        verify(users, never()).save(any());
    }
}
