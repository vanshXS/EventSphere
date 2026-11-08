
package com.vansh.eventsphere.eventsphere.college.service;

import com.vansh.eventsphere.eventsphere.college.model.*;
import com.vansh.eventsphere.eventsphere.college.repository.*;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CollegeVerificationServiceTest {

    @Mock
    private CollegeApplicationRepository applicationRepository;

    @Mock
    private CollegeRepository collegeRepository;

    @Mock
    private CollegeAdminAssignmentRepository assignmentRepository;

    @Mock
    private CollegeAffiliationRequestRepository affiliationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OTPService otpService;

    @Mock
    private EmailService emailService;

    @Mock
    private DocumentStorageService documentStorageService;

    @InjectMocks
    private CollegeVerificationService service;

    @Test
    void verifyDomainOTP_shouldVerifyApplicationWhenOtpIsCorrect() {
        String applicationId = "application-1";
        String email = "admin@college.edu";

        CollegeApplication application = mock(CollegeApplication.class);
        OTPChallenge challenge = mock(OTPChallenge.class);

        when(applicationRepository.findById(applicationId))
                .thenReturn(Optional.of(application));

        when(application.getVerificationStatus())
                .thenReturn(CollegeVerificationStatus.PENDING_VERIFICATION);

        when(application.getVerificationMode())
                .thenReturn(CollegeVerificationMode.OFFICIAL_DOMAIN);

        when(application.getDomainContactEmail()).thenReturn(email);

        when(otpService.findValidChallenge(
                applicationId, email, "COLLEGE_DOMAIN_VERIFICATION"
        )).thenReturn(Optional.of(challenge));

        when(otpService.verifyOTP(challenge, "123456"))
                .thenReturn(true);

        when(challenge.getId()).thenReturn("challenge-1");

        service.verifyDomainOTP(applicationId, email, "123456");

        verify(application).setDomainOwnershipVerifiedAt(any());
        verify(application).setDomainVerificationToken("challenge-1");
        verify(applicationRepository).save(application);
        verify(otpService).deleteChallenge(challenge);
    }

    @Test
    void verifyDomainOTP_shouldThrowWhenOtpIsIncorrect() {
        String applicationId = "application-1";
        String email = "admin@college.edu";

        CollegeApplication application = mock(CollegeApplication.class);
        OTPChallenge challenge = mock(OTPChallenge.class);

        when(applicationRepository.findById(applicationId))
                .thenReturn(Optional.of(application));

        when(application.getVerificationStatus())
                .thenReturn(CollegeVerificationStatus.PENDING_VERIFICATION);

        when(application.getVerificationMode())
                .thenReturn(CollegeVerificationMode.OFFICIAL_DOMAIN);

        when(application.getDomainContactEmail()).thenReturn(email);

        when(otpService.findValidChallenge(
                applicationId, email, "COLLEGE_DOMAIN_VERIFICATION"
        )).thenReturn(Optional.of(challenge));

        when(challenge.getAttempts()).thenReturn(1);
        when(challenge.getMaxAttempts()).thenReturn(5);

        when(otpService.verifyOTP(challenge, "000000"))
                .thenReturn(false);

        assertThrows(
                BadRequestException.class,
                () -> service.verifyDomainOTP(applicationId, email, "000000")
        );

        verify(applicationRepository, never()).save(any());
        verify(otpService, never()).deleteChallenge(challenge);
    }

    @Test
    void verifyStudentAffiliationOTP_shouldVerifyParticipantWhenOtpIsCorrect() {
        String userId = "user-1";
        String collegeId = "college-1";
        String email = "student@college.edu";

        User participant = mock(User.class);
        College college = mock(College.class);
        OTPChallenge challenge = mock(OTPChallenge.class);

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(participant));

        when(participant.getCollegeId()).thenReturn(collegeId);
        when(participant.getEmail()).thenReturn(email);
        when(participant.getCollegeVerificationStatus()).thenReturn("PENDING");

        when(collegeRepository.findById(collegeId))
                .thenReturn(Optional.of(college));

        when(college.getVerificationStatus())
                .thenReturn(CollegeVerificationStatus.VERIFIED);

        when(college.getVerificationMode())
                .thenReturn(CollegeVerificationMode.OFFICIAL_DOMAIN);

        when(college.getVerifiedDomains())
                .thenReturn(List.of("college.edu"));

        when(otpService.findValidChallenge(
                userId, email, "STUDENT_AFFILIATION_VERIFICATION"
        )).thenReturn(Optional.of(challenge));

        when(otpService.verifyOTP(challenge, "123456"))
                .thenReturn(true);

        when(college.getId()).thenReturn(collegeId);

        service.verifyStudentAffiliationOTP(userId, "123456");

        verify(participant).setCollegeVerificationStatus("VERIFIED");
        verify(participant).setCollegeVerifiedAt(any());
        verify(userRepository).save(participant);
        verify(otpService).deleteChallenge(challenge);
    }

    @Test
    void verifyStudentAffiliationOTP_shouldRejectIncorrectOtp() {
        String userId = "user-1";
        String collegeId = "college-1";
        String email = "student@college.edu";

        User participant = mock(User.class);
        College college = mock(College.class);
        OTPChallenge challenge = mock(OTPChallenge.class);

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(participant));

        when(participant.getCollegeId()).thenReturn(collegeId);
        when(participant.getEmail()).thenReturn(email);
        when(participant.getCollegeVerificationStatus()).thenReturn("PENDING");

        when(collegeRepository.findById(collegeId))
                .thenReturn(Optional.of(college));

        when(college.getVerificationStatus())
                .thenReturn(CollegeVerificationStatus.VERIFIED);

        when(college.getVerificationMode())
                .thenReturn(CollegeVerificationMode.OFFICIAL_DOMAIN);

        when(college.getVerifiedDomains())
                .thenReturn(List.of("college.edu"));

        when(otpService.findValidChallenge(
                userId, email, "STUDENT_AFFILIATION_VERIFICATION"
        )).thenReturn(Optional.of(challenge));

        when(challenge.getAttempts()).thenReturn(1);
        when(challenge.getMaxAttempts()).thenReturn(5);

        when(otpService.verifyOTP(challenge, "000000"))
                .thenReturn(false);

        assertThrows(
                BadRequestException.class,
                () -> service.verifyStudentAffiliationOTP(userId, "000000")
        );

        verify(userRepository, never()).save(any());
        verify(otpService, never()).deleteChallenge(challenge);
    }

    @Test
    void bothVerificationMethods_shouldCommitFailedAttemptUpdates() throws Exception {
        Method domainMethod = CollegeVerificationService.class.getMethod(
                "verifyDomainOTP", String.class, String.class, String.class
        );

        Method studentMethod = CollegeVerificationService.class.getMethod(
                "verifyStudentAffiliationOTP", String.class, String.class
        );

        assertNoRollbackForBadRequest(domainMethod);
        assertNoRollbackForBadRequest(studentMethod);
    }

    private void assertNoRollbackForBadRequest(Method method) {
        Transactional transactional =
                method.getAnnotation(Transactional.class);

        assertNotNull(transactional);

        assertTrue(
                List.of(transactional.noRollbackFor())
                        .contains(BadRequestException.class)
        );
    }
}
