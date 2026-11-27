package com.vansh.eventsphere.eventsphere.auth.service;

import com.vansh.eventsphere.eventsphere.auth.dto.*;
import com.vansh.eventsphere.eventsphere.auth.security.JwtService;
import com.vansh.eventsphere.eventsphere.auth.security.RefreshTokenService;
import com.vansh.eventsphere.eventsphere.college.model.College;
import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationMode;
import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationStatus;
import com.vansh.eventsphere.eventsphere.college.model.OTPChallenge;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeRepository;
import com.vansh.eventsphere.eventsphere.college.service.EmailService;
import com.vansh.eventsphere.eventsphere.college.service.OTPService;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceAlreadyExistsException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.refresh_token.model.RefreshToken;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceRegistrationTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CollegeRepository collegeRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private OTPService otpService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private College verifiedCollege;

    @BeforeEach
    void setUp() {
        verifiedCollege = College.builder()
                .id("college-1")
                .name("Panipat Institute of Engineering and Technology")
                .code("PIET")
                .verificationStatus(CollegeVerificationStatus.VERIFIED)
                .verificationMode(CollegeVerificationMode.OFFICIAL_DOMAIN)
                .verifiedDomains(List.of("piet.ac.in"))
                .build();
    }

    @Test
    void registerOrganizer_createsUnverifiedUserAndSendsOTP() {
        OrganizerRegisterRequest request = new OrganizerRegisterRequest();
        request.setName("John Doe");
        request.setEmail("organizer@piet.ac.in");
        request.setPassword("password123");
        request.setCollegeId("college-1");

        when(userRepository.existsByEmail("organizer@piet.ac.in")).thenReturn(false);
        when(collegeRepository.findById("college-1")).thenReturn(Optional.of(verifiedCollege));
        when(passwordEncoder.encode("password123")).thenReturn("encoded-pass");

        OTPChallenge challenge = OTPChallenge.builder()
                .id("chal-1")
                .targetId("user-1")
                .email("organizer@piet.ac.in")
                .purpose(AuthService.OTP_PURPOSE_USER_REGISTRATION)
                .build();

        when(otpService.createChallenge(any(), eq("organizer@piet.ac.in"), eq(AuthService.OTP_PURPOSE_USER_REGISTRATION)))
                .thenReturn(new OTPService.GeneratedOTP(challenge, "123456"));

        RegistrationResponse response = authService.registerOrganizer(request);

        assertNotNull(response);
        assertFalse(response.isEmailVerified());
        assertEquals("organizer@piet.ac.in", response.getEmail());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertEquals("John Doe", savedUser.getName());
        assertEquals("organizer@piet.ac.in", savedUser.getEmail());
        assertEquals(Role.ORGANIZER, savedUser.getRole());
        assertEquals(Boolean.FALSE, savedUser.getEmailVerified());
        assertTrue(savedUser.isActive());

        verify(emailService).sendRegistrationOTP("organizer@piet.ac.in", "123456");
    }

    @Test
    void registerOrganizer_rejectsWhenEmailDoesNotMatchVerifiedDomain() {
        OrganizerRegisterRequest request = new OrganizerRegisterRequest();
        request.setName("John Doe");
        request.setEmail("organizer@gmail.com");
        request.setPassword("password123");
        request.setCollegeId("college-1");

        when(userRepository.existsByEmail("organizer@gmail.com")).thenReturn(false);
        when(collegeRepository.findById("college-1")).thenReturn(Optional.of(verifiedCollege));

        assertThrows(BadRequestException.class, () -> authService.registerOrganizer(request));
        verify(userRepository, never()).save(any());
        verify(otpService, never()).createChallenge(any(), any(), any());
    }

    @Test
    void registerParticipant_createsUnverifiedUserAndSendsOTP() {
        ParticipantRegisterRequest request = new ParticipantRegisterRequest();
        request.setName("Alice Smith");
        request.setEmail("student@piet.ac.in");
        request.setPassword("password123");
        request.setCollegeCode("PIET");

        when(userRepository.existsByEmail("student@piet.ac.in")).thenReturn(false);
        when(collegeRepository.findByCode("PIET")).thenReturn(Optional.of(verifiedCollege));
        when(passwordEncoder.encode("password123")).thenReturn("encoded-pass");

        OTPChallenge challenge = OTPChallenge.builder()
                .id("chal-2")
                .targetId("user-2")
                .email("student@piet.ac.in")
                .purpose(AuthService.OTP_PURPOSE_USER_REGISTRATION)
                .build();

        when(otpService.createChallenge(any(), eq("student@piet.ac.in"), eq(AuthService.OTP_PURPOSE_USER_REGISTRATION)))
                .thenReturn(new OTPService.GeneratedOTP(challenge, "654321"));

        RegistrationResponse response = authService.registerParticipant(request);

        assertNotNull(response);
        assertFalse(response.isEmailVerified());
        assertEquals("student@piet.ac.in", response.getEmail());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertEquals(Role.PARTICIPANT, savedUser.getRole());
        assertEquals(Boolean.FALSE, savedUser.getEmailVerified());

        verify(emailService).sendRegistrationOTP("student@piet.ac.in", "654321");
    }

    @Test
    void verifyRegistrationEmail_successMarksUserVerifiedAndDeletesChallenge() {
        User user = User.builder()
                .userId("user-1")
                .email("user@piet.ac.in")
                .emailVerified(false)
                .build();

        when(userRepository.findByEmail("user@piet.ac.in")).thenReturn(Optional.of(user));

        OTPChallenge challenge = OTPChallenge.builder()
                .id("chal-1")
                .targetId("user-1")
                .email("user@piet.ac.in")
                .purpose(AuthService.OTP_PURPOSE_USER_REGISTRATION)
                .attempts(0)
                .maxAttempts(5)
                .build();

        when(otpService.findValidChallenge("user-1", "user@piet.ac.in", AuthService.OTP_PURPOSE_USER_REGISTRATION))
                .thenReturn(Optional.of(challenge));
        when(otpService.verifyOTP(challenge, "123456")).thenReturn(true);

        VerifyRegistrationEmailRequest request = new VerifyRegistrationEmailRequest("user@piet.ac.in", "123456");
        authService.verifyRegistrationEmail(request);

        assertTrue(user.getEmailVerified());
        verify(userRepository).save(user);
        verify(otpService).deleteChallenge(challenge);
    }

    @Test
    void verifyRegistrationEmail_throwsWhenAlreadyVerified() {
        User user = User.builder()
                .userId("user-1")
                .email("user@piet.ac.in")
                .emailVerified(true)
                .build();

        when(userRepository.findByEmail("user@piet.ac.in")).thenReturn(Optional.of(user));

        VerifyRegistrationEmailRequest request = new VerifyRegistrationEmailRequest("user@piet.ac.in", "123456");
        assertThrows(BadRequestException.class, () -> authService.verifyRegistrationEmail(request));
    }

    @Test
    void verifyRegistrationEmail_throwsWhenChallengeNotFoundOrExpired() {
        User user = User.builder()
                .userId("user-1")
                .email("user@piet.ac.in")
                .emailVerified(false)
                .build();

        when(userRepository.findByEmail("user@piet.ac.in")).thenReturn(Optional.of(user));
        when(otpService.findValidChallenge("user-1", "user@piet.ac.in", AuthService.OTP_PURPOSE_USER_REGISTRATION))
                .thenReturn(Optional.empty());

        VerifyRegistrationEmailRequest request = new VerifyRegistrationEmailRequest("user@piet.ac.in", "123456");
        assertThrows(BadRequestException.class, () -> authService.verifyRegistrationEmail(request));
    }

    @Test
    void verifyRegistrationEmail_handlesIncorrectOtpAndEnforcesMaxAttempts() {
        User user = User.builder()
                .userId("user-1")
                .email("user@piet.ac.in")
                .emailVerified(false)
                .build();

        when(userRepository.findByEmail("user@piet.ac.in")).thenReturn(Optional.of(user));

        OTPChallenge challenge = OTPChallenge.builder()
                .id("chal-1")
                .targetId("user-1")
                .email("user@piet.ac.in")
                .purpose(AuthService.OTP_PURPOSE_USER_REGISTRATION)
                .attempts(4)
                .maxAttempts(5)
                .build();

        when(otpService.findValidChallenge("user-1", "user@piet.ac.in", AuthService.OTP_PURPOSE_USER_REGISTRATION))
                .thenReturn(Optional.of(challenge));
        when(otpService.verifyOTP(challenge, "999999")).thenAnswer(inv -> {
            challenge.setAttempts(5);
            return false;
        });

        VerifyRegistrationEmailRequest request = new VerifyRegistrationEmailRequest("user@piet.ac.in", "999999");
        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.verifyRegistrationEmail(request));
        assertTrue(ex.getMessage().contains("Maximum OTP attempts exceeded"));
        verify(otpService).deleteChallenge(challenge);
        assertFalse(user.getEmailVerified());
    }

    @Test
    void resendRegistrationOTP_invalidatesOldChallengeAndGeneratesNew() {
        User user = User.builder()
                .userId("user-1")
                .email("user@piet.ac.in")
                .emailVerified(false)
                .build();

        when(userRepository.findByEmail("user@piet.ac.in")).thenReturn(Optional.of(user));

        OTPChallenge oldChallenge = OTPChallenge.builder()
                .id("chal-old")
                .targetId("user-1")
                .email("user@piet.ac.in")
                .purpose(AuthService.OTP_PURPOSE_USER_REGISTRATION)
                .build();

        when(otpService.findLatestChallenge("user-1", "user@piet.ac.in", AuthService.OTP_PURPOSE_USER_REGISTRATION))
                .thenReturn(Optional.of(oldChallenge));
        when(otpService.canResend(oldChallenge)).thenReturn(true);

        OTPChallenge newChallenge = OTPChallenge.builder()
                .id("chal-new")
                .targetId("user-1")
                .email("user@piet.ac.in")
                .purpose(AuthService.OTP_PURPOSE_USER_REGISTRATION)
                .build();

        when(otpService.createChallenge("user-1", "user@piet.ac.in", AuthService.OTP_PURPOSE_USER_REGISTRATION))
                .thenReturn(new OTPService.GeneratedOTP(newChallenge, "888888"));

        ResendRegistrationOtpRequest request = new ResendRegistrationOtpRequest("user@piet.ac.in");
        authService.resendRegistrationOTP(request);

        verify(otpService).invalidateChallenge("user-1", "user@piet.ac.in", AuthService.OTP_PURPOSE_USER_REGISTRATION);
        verify(emailService).sendRegistrationOTP("user@piet.ac.in", "888888");
    }

    @Test
    void resendRegistrationOTP_enforcesCooldown() {
        User user = User.builder()
                .userId("user-1")
                .email("user@piet.ac.in")
                .emailVerified(false)
                .build();

        when(userRepository.findByEmail("user@piet.ac.in")).thenReturn(Optional.of(user));

        OTPChallenge oldChallenge = OTPChallenge.builder()
                .id("chal-old")
                .targetId("user-1")
                .email("user@piet.ac.in")
                .purpose(AuthService.OTP_PURPOSE_USER_REGISTRATION)
                .build();

        when(otpService.findLatestChallenge("user-1", "user@piet.ac.in", AuthService.OTP_PURPOSE_USER_REGISTRATION))
                .thenReturn(Optional.of(oldChallenge));
        when(otpService.canResend(oldChallenge)).thenReturn(false);

        ResendRegistrationOtpRequest request = new ResendRegistrationOtpRequest("user@piet.ac.in");
        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.resendRegistrationOTP(request));
        assertTrue(ex.getMessage().contains("Please wait 60 seconds"));
    }

    @Test
    void refreshAccessToken_rejectsUnverifiedUser() {
        RefreshToken token = RefreshToken.builder()
                .id("rt-1")
                .userId("user-1")
                .build();

        when(refreshTokenService.validateRefreshToken("raw-rt")).thenReturn(token);

        User unverifiedUser = User.builder()
                .userId("user-1")
                .email("user@piet.ac.in")
                .active(true)
                .emailVerified(false)
                .build();

        when(userRepository.findById("user-1")).thenReturn(Optional.of(unverifiedUser));

        assertThrows(BadRequestException.class, () -> authService.refreshAccessToken("raw-rt"));
    }

    @Test
    void refreshAccessToken_allowsVerifiedUser() {
        RefreshToken token = RefreshToken.builder()
                .id("rt-1")
                .userId("user-1")
                .build();

        when(refreshTokenService.validateRefreshToken("raw-rt")).thenReturn(token);

        User verifiedUser = User.builder()
                .userId("user-1")
                .email("user@piet.ac.in")
                .role(Role.PARTICIPANT)
                .active(true)
                .emailVerified(true)
                .build();

        when(userRepository.findById("user-1")).thenReturn(Optional.of(verifiedUser));
        when(jwtService.generateAccessToken(verifiedUser)).thenReturn("new-access-token");

        AuthResult result = authService.refreshAccessToken("raw-rt");
        assertNotNull(result);
        assertEquals("new-access-token", result.getAccessToken());
    }

    @Test
    void refreshAccessToken_allowsLegacyUserWithNullEmailVerified() {
        RefreshToken token = RefreshToken.builder()
                .id("rt-1")
                .userId("user-1")
                .build();

        when(refreshTokenService.validateRefreshToken("raw-rt")).thenReturn(token);

        User legacyUser = User.builder()
                .userId("user-1")
                .email("user@piet.ac.in")
                .role(Role.PARTICIPANT)
                .active(true)
                .emailVerified(null) // legacy user
                .build();

        when(userRepository.findById("user-1")).thenReturn(Optional.of(legacyUser));
        when(jwtService.generateAccessToken(legacyUser)).thenReturn("new-access-token");

        AuthResult result = authService.refreshAccessToken("raw-rt");
        assertNotNull(result);
        assertEquals("new-access-token", result.getAccessToken());
    }
}

