package com.vansh.eventsphere.eventsphere.auth.controller;

import com.vansh.eventsphere.eventsphere.auth.dto.*;
import com.vansh.eventsphere.eventsphere.user.model.User;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.coyote.Response;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;

import com.vansh.eventsphere.eventsphere.auth.service.AuthService;
import com.vansh.eventsphere.eventsphere.college.service.CollegeVerificationService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final CollegeVerificationService collegeVerificationService;

    @PostMapping("/register/organizer")
    @ResponseStatus(HttpStatus.CREATED)
    public RegistrationResponse registerOrganizer(
        @Valid @RequestBody OrganizerRegisterRequest registerRequest
    ){
        return authService.registerOrganizer(registerRequest);
    }

    @PostMapping("/register/participant")
    @ResponseStatus(HttpStatus.CREATED)
    public RegistrationResponse registerParticipant(
        @Valid @RequestBody ParticipantRegisterRequest registerRequest
    ) {
        return authService.registerParticipant(registerRequest);
    }

    @PostMapping("/register/verify-email")
    public void verifyRegistrationEmail(@Valid @RequestBody VerifyRegistrationEmailRequest request) {
        authService.verifyRegistrationEmail(request);
    }

    @PostMapping("/register/resend-otp")
    public void resendRegistrationOTP(@Valid @RequestBody ResendRegistrationOtpRequest request) {
        authService.resendRegistrationOTP(request);
    }

    @PostMapping("/college-admin/accept-invitation")
    public void acceptCollegeAdminInvitation(@Valid @RequestBody AcceptCollegeAdminInvitationRequest request) {
        // Delegated to the verification service so token hashing and assignment are atomic.
        collegeVerificationService.acceptCollegeAdminInvitation(request.getToken(), request.getPassword());
    }

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {

          AuthResult authResult = authService.login(request);

        ResponseCookie accessCookie = ResponseCookie
                .from("accessToken", authResult.getAccessToken())
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(15 * 60)
                .build();

        ResponseCookie refreshCookie =
                ResponseCookie.from("refreshToken", authResult.getRefreshToken())
                        .httpOnly(true)
                        .secure(false)
                        .sameSite("Lax")
                        .path("/api/auth")
                        .maxAge(7 * 24 * 60 * 60)
                        .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        return authResult.getAuthResponse();
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(
            @CookieValue(
                    name = "refreshToken",
                    required = false
            ) String refreshToken,
            HttpServletResponse response
    ) {
        if(refreshToken == null) throw new RuntimeException("Refresh token missing");

        AuthResult result = authService.refreshAccessToken(refreshToken);

        ResponseCookie accessCookie = ResponseCookie
                .from(
                        "accessToken", result.getAccessToken()
                )
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(15 * 60)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

        return result.getAuthResponse();
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            @CookieValue(
                    name = "refreshToken",
                    required = false
            ) String refreshToken,
            HttpServletResponse response
    ) {

        authService.logout(refreshToken);

        ResponseCookie accessCookie = ResponseCookie.from("accessToken", "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();

        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(false)
                .path("/api/auth")
                .maxAge(0)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());


    }
    
}
