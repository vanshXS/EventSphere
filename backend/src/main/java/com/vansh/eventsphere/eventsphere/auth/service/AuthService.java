package com.vansh.eventsphere.eventsphere.auth.service;


import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import com.vansh.eventsphere.eventsphere.auth.dto.*;
import com.vansh.eventsphere.eventsphere.auth.security.JwtService;
import com.vansh.eventsphere.eventsphere.auth.security.RefreshTokenService;
import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationMode;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.refresh_token.model.RefreshToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.vansh.eventsphere.eventsphere.college.model.College;
import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationMode;
import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationStatus;
import com.vansh.eventsphere.eventsphere.college.model.OTPChallenge;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeRepository;
import com.vansh.eventsphere.eventsphere.college.service.EmailService;
import com.vansh.eventsphere.eventsphere.college.service.OTPService;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import com.vansh.eventsphere.eventsphere.exception.ResourceAlreadyExistsException;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {


    private final UserRepository userRepository;
    private final CollegeRepository collegeRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final OTPService otpService;
    private final EmailService emailService;

    public static final String OTP_PURPOSE_USER_REGISTRATION = "USER_REGISTRATION_EMAIL";

    

    public RegistrationResponse registerOrganizer(
        OrganizerRegisterRequest
        request
    ) {

        log.info("Organizer registration attempt: {}", request.getEmail()
        );

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if(userRepository.existsByEmail(normalizedEmail)){
            log.warn(
                "Email already exists: {}",
                request.getEmail()
            );
            throw new ResourceAlreadyExistsException("Email is already registered");
        }

        LocalDateTime now = LocalDateTime.now();


        College college = collegeRepository.findById(request.getCollegeId())
                .orElseThrow(() -> new ResourceNotFoundException("College not found"));

        if (college.getVerificationStatus() != CollegeVerificationStatus.VERIFIED) {
            throw new BadRequestException("College is not verified. Only verified colleges can register organizers.");
        }

        if (college.getVerificationMode() == CollegeVerificationMode.OFFICIAL_DOMAIN) {
            List<String> allowedDomains = getCollegeAllowedDomains(college);
            if (allowedDomains.isEmpty()) {
                throw new BadRequestException("College is configured for official domain verification, but no official domain is configured.");
            }
            String domain = extractDomain(normalizedEmail);
            if (domain == null || !allowedDomains.contains(domain)) {
                throw new BadRequestException("Organizer email must belong to one of the college's verified domains: @"
                        + String.join(", @", allowedDomains));
            }
        }

        User organizer = User.builder()
        .name(request.getName().trim())
        .email(normalizedEmail)
        .password(passwordEncoder.encode(request.getPassword()))
        .role(Role.ORGANIZER)
        .collegeId(college.getId())
        .active(true)
        .emailVerified(false)
        .organizerAffiliationStatus("UNVERIFIED")
        .createdAt(now)
        .updatedAt(now)
        .build();

        userRepository.save(organizer);
        log.info(
            "Organizer registered successfully: {}",
            normalizedEmail
        );

        sendRegistrationOTPInternal(organizer);

        return RegistrationResponse.builder()
                .message("Organizer registration initiated. Please verify your email with the OTP sent to your address.")
                .email(normalizedEmail)
                .emailVerified(false)
                .build();
    }

    public RegistrationResponse registerParticipant(
        ParticipantRegisterRequest 
        request
    ) {

        log.info("Participant registration attempt: {}", request.getEmail());

        String email = request.getEmail().trim().toLowerCase();
        String collegeCode = request.getCollegeCode().trim().toUpperCase();

        if(userRepository.existsByEmail(email)) {
            log.warn("Participant registration failed. Email already exists: {}", email);
            throw new ResourceAlreadyExistsException("Email is already registered");
        }

        College college = collegeRepository.findByCode(collegeCode)
        .orElseThrow(() -> {
            log.warn("Participant registration failed. College code not found: {}", collegeCode);
            return new ResourceNotFoundException("College not found with code: " + collegeCode);
        });

        if (college.getVerificationStatus() != CollegeVerificationStatus.VERIFIED) {
            throw new BadRequestException("College is not verified. Only verified colleges can register participants.");
        }

        if (college.getVerificationMode() == CollegeVerificationMode.OFFICIAL_DOMAIN) {
            List<String> allowedDomains = getCollegeAllowedDomains(college);
            if (allowedDomains.isEmpty()) {
                throw new BadRequestException("College is configured for official domain verification, but no official domain is configured.");
            }
            String domain = extractDomain(email);
            if (domain == null || !allowedDomains.contains(domain)) {
                throw new BadRequestException("Participant email must belong to one of the college's verified domains: @"
                        + String.join(", @", allowedDomains));
            }
        }


        LocalDateTime now = LocalDateTime.now();

        User participant = User.builder()
                .name(request.getName().trim())
                .email(email)
                .role(Role.PARTICIPANT)
                .password(passwordEncoder.encode(request.getPassword()))
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .collegeId(college.getId())
                .collegeVerificationStatus("UNVERIFIED")
                .emailVerified(false)
                .build();

        userRepository.save(participant);

        log.info(
                "Participant registered successfully. User Id: {}, College ID: {}",
                participant.getUserId(), college.getId()
        );

        sendRegistrationOTPInternal(participant);

        return RegistrationResponse.builder()
                .message("Participant registration initiated. Please verify your email with the OTP sent to your address.")
                .email(email)
                .emailVerified(false)
                .build();
    }

    private void sendRegistrationOTPInternal(User user) {
        try {
            OTPService.GeneratedOTP generated = otpService.createChallenge(
                    user.getUserId(),
                    user.getEmail(),
                    OTP_PURPOSE_USER_REGISTRATION
            );
            emailService.sendRegistrationOTP(user.getEmail(), generated.rawOtp());
        } catch (Exception e) {
            log.error("Failed to send registration OTP to email '{}': {}", user.getEmail(), e.getMessage());
            // Account is saved with emailVerified=false so user can resend via /register/resend-otp
        }
    }

    public AuthResult login(LoginRequest request) {

        String email = request.getEmail()
                .trim()
                .toLowerCase();

        log.info("Login attempt: {}", email);

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword())
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with this email: " + email));

        log.info(
                "Login successful. User Id: {}, Role: {}, College: {}",
                user.getUserId(),
                user.getRole(),
                user.getCollegeId()
        );

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = refreshTokenService.createRefreshToken(user);


        College college = user.getCollegeId() != null
                ? collegeRepository.findById(user.getCollegeId()).orElse(null)
                : null;

        AuthResponse response = AuthResponse.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .collegeId(user.getCollegeId())
                .collegeName(college != null ? college.getName() : null)
                .collegeCode(college != null ? college.getCode() : null)
                .collegeVerificationStatus(user.getCollegeVerificationStatus())
                .organizerAffiliationStatus(user.getOrganizerAffiliationStatus())
                .build();

        return new AuthResult(response, accessToken, refreshToken);

    }

    public AuthResult refreshAccessToken(String refreshToken ) {

        RefreshToken existedRefreshToken = refreshTokenService.validateRefreshToken(refreshToken);

        User user = userRepository.findById(existedRefreshToken.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!user.isActive()) throw new RuntimeException("User is not active");
        if (Boolean.FALSE.equals(user.getEmailVerified())) {
            throw new BadRequestException("Email is not verified. Please verify your email before accessing the platform.");
        }

        String newAccessToken = jwtService.generateAccessToken(user);

        College refreshCollege = user.getCollegeId() != null
                ? collegeRepository.findById(user.getCollegeId()).orElse(null)
                : null;

        AuthResponse response = AuthResponse.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .collegeId(user.getCollegeId())
                .collegeName(refreshCollege != null ? refreshCollege.getName() : null)
                .collegeCode(refreshCollege != null ? refreshCollege.getCode() : null)
                .collegeVerificationStatus(user.getCollegeVerificationStatus())
                .organizerAffiliationStatus(user.getOrganizerAffiliationStatus())
                .build();

        return new AuthResult(
                response,
                newAccessToken,
                null
        );
    }

    public void verifyRegistrationEmail(VerifyRegistrationEmailRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + normalizedEmail));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new BadRequestException("Email is already verified");
        }

        Optional<OTPChallenge> challengeOpt = otpService.findValidChallenge(
                user.getUserId(),
                normalizedEmail,
                OTP_PURPOSE_USER_REGISTRATION
        );

        if (challengeOpt.isEmpty()) {
            throw new BadRequestException("Invalid or expired OTP challenge");
        }

        OTPChallenge challenge = challengeOpt.get();

        if (!otpService.verifyOTP(challenge, request.getOtp())) {
            int remaining = challenge.getMaxAttempts() - challenge.getAttempts();
            if (remaining <= 0) {
                otpService.deleteChallenge(challenge);
                throw new BadRequestException("Maximum OTP attempts exceeded. Request a new code.");
            }
            throw new BadRequestException("Invalid OTP. Attempts remaining: " + remaining);
        }

        user.setEmailVerified(true);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        otpService.deleteChallenge(challenge);

        log.info("Email verified successfully for user: {}", normalizedEmail);
    }

    public void resendRegistrationOTP(ResendRegistrationOtpRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + normalizedEmail));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new BadRequestException("Email is already verified");
        }

        Optional<OTPChallenge> existingChallenge = otpService.findLatestChallenge(
                user.getUserId(),
                normalizedEmail,
                OTP_PURPOSE_USER_REGISTRATION
        );

        if (existingChallenge.isPresent() && !otpService.canResend(existingChallenge.get())) {
            throw new BadRequestException("Please wait 60 seconds before requesting another OTP");
        }

        otpService.invalidateChallenge(
                user.getUserId(),
                normalizedEmail,
                OTP_PURPOSE_USER_REGISTRATION
        );

        OTPService.GeneratedOTP generated = otpService.createChallenge(
                user.getUserId(),
                normalizedEmail,
                OTP_PURPOSE_USER_REGISTRATION
        );

        try {
            emailService.sendRegistrationOTP(normalizedEmail, generated.rawOtp());
        } catch (Exception e) {
            otpService.deleteChallenge(generated.challenge());
            log.error("Failed to resend registration OTP to {}: {}", normalizedEmail, e.getMessage());
            throw new BadRequestException("Failed to send verification email. Please try again later.");
        }

        log.info("Registration OTP resent successfully to {}", normalizedEmail);
    }

    public void logout(String rawRefreshToken) {

        if(rawRefreshToken == null) return;

        refreshTokenService.revokeToken(rawRefreshToken);

        log.info("User logged out successfully");

    }

    private String extractDomain(String email) {
        if (email == null || !email.contains("@")) return null;
        return email.substring(email.lastIndexOf("@") + 1).toLowerCase();
    }

    private List<String> getCollegeAllowedDomains(College college) {
        Set<String> domains = new HashSet<>();
        if (college.getVerifiedDomains() != null) {
            for (String d : college.getVerifiedDomains()) {
                if (d != null && !d.isBlank()) {
                    domains.add(d.trim().toLowerCase());
                }
            }
        }
        if (college.getProposedDomain() != null && !college.getProposedDomain().isBlank()) {
            domains.add(college.getProposedDomain().trim().toLowerCase());
        }
        return new ArrayList<>(domains);
    }

}
