package com.vansh.eventsphere.eventsphere.auth.service;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.vansh.eventsphere.eventsphere.auth.dto.*;
import com.vansh.eventsphere.eventsphere.auth.security.JwtService;
import com.vansh.eventsphere.eventsphere.auth.security.RefreshTokenService;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.refresh_token.model.RefreshToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.vansh.eventsphere.eventsphere.college.model.College;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeRepository;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import com.vansh.eventsphere.eventsphere.exception.ResourceAlreadyExistsException;

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

        if(userRepository.existsByEmail(request.getEmail())){
            log.warn(
                "Email already exists: {}", 
                request.getEmail()
            );
            throw new ResourceAlreadyExistsException("Email is already registered");
        }

        LocalDateTime now = LocalDateTime.now();


        College college = collegeRepository.findById(request.getCollegeId())
                .orElseThrow(() -> new ResourceNotFoundException("College not found"));
 
        User organizer = User.builder()
        .name(request.getName())
        .email(request.getEmail())
        .password(passwordEncoder.encode(request.getPassword()))
        .role(Role.ORGANIZER)
        .collegeId(college.getId())
        .active(true)
        .createdAt(now)
        .build();

        userRepository.save(organizer);
        log.info(
            "Organizer registered successfully: {}", 
            request.getEmail()
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


        LocalDateTime now = LocalDateTime.now();

        User participant = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .role(Role.PARTICIPANT)
                .password(passwordEncoder.encode(request.getPassword()))
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .collegeId(college.getId())
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


        AuthResponse response = AuthResponse.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .collegeId(user.getCollegeId()).build();

        return new AuthResult(response, accessToken, refreshToken);

    }

    public AuthResult refreshAccessToken(String refreshToken ) {

        RefreshToken existedRefreshToken = refreshTokenService.validateRefreshToken(refreshToken);

        User user = userRepository.findById(existedRefreshToken.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if(!user.isActive()) throw new RuntimeException("User is not active");

        String newAccessToken = jwtService.generateAccessToken(user);

        AuthResponse response = AuthResponse.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .collegeId(user.getCollegeId()).build();

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

}
