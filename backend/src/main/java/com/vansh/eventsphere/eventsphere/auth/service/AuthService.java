package com.vansh.eventsphere.eventsphere.auth.service;

import java.time.LocalDate;
import java.time.LocalDateTime;

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
import com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationStatus;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeRepository;
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

    

    public void registerOrganizer(
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

        if (college.getVerificationMode() == CollegeVerificationMode.OFFICIAL_DOMAIN
                && college.getVerifiedDomains() != null
                && !college.getVerifiedDomains().isEmpty()) {
            String domain = extractDomain(normalizedEmail);
            if (domain == null || !college.getVerifiedDomains().contains(domain)) {
                throw new BadRequestException("Organizer email must belong to the college's verified domain: "
                        + String.join(", ", college.getVerifiedDomains()));
            }
        }

        User organizer = User.builder()
        .name(request.getName())
        .email(normalizedEmail)
        .password(passwordEncoder.encode(request.getPassword()))
        .role(Role.ORGANIZER)
        .collegeId(college.getId())
        .active(true)
        .createdAt(now)
        .build();

        userRepository.save(organizer);
        log.info(
            "Organizer registered successfully: {}",
            normalizedEmail
        );
    }

    public void registerParticipant(
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

        if (college.getVerificationMode() == CollegeVerificationMode.OFFICIAL_DOMAIN
                && college.getVerifiedDomains() != null
                && !college.getVerifiedDomains().isEmpty()) {
            String domain = extractDomain(email);
            if (domain == null || !college.getVerifiedDomains().contains(domain)) {
                throw new BadRequestException("Participant email must belong to the college's verified domain: "
                        + String.join(", ", college.getVerifiedDomains()));
            }
        }


        LocalDateTime now = LocalDateTime.now();

        User participant = User.builder()
                .name(request.getName())
                .email(email)
                .role(Role.PARTICIPANT)
                .password(passwordEncoder.encode(request.getPassword()))
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .collegeId(college.getId())
                .collegeVerificationStatus("UNVERIFIED")
                .build();

        userRepository.save(participant);

        log.info(
                "Participant registered successfully. User Id: {}, College ID: {}",
                participant.getUserId(), college.getId()
        );

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
                .build();

        return new AuthResult(response, accessToken, refreshToken);

    }

    public AuthResult refreshAccessToken(String refreshToken ) {

        RefreshToken existedRefreshToken = refreshTokenService.validateRefreshToken(refreshToken);

        User user = userRepository.findById(existedRefreshToken.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if(!user.isActive()) throw new RuntimeException("User is not active");

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
                .build();

        return new AuthResult(
                response,
                newAccessToken,
                null
        );
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

}
