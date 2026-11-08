package com.vansh.eventsphere.eventsphere.college.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.vansh.eventsphere.eventsphere.college.dto.AssignCollegeAdminRequest;
import com.vansh.eventsphere.eventsphere.college.dto.CollegeApplicationRequest;
import com.vansh.eventsphere.eventsphere.college.dto.CollegeApplicationResponse;
import com.vansh.eventsphere.eventsphere.college.dto.DomainOTPRequest;
import com.vansh.eventsphere.eventsphere.college.dto.VerifyDomainOTPRequest;
import com.vansh.eventsphere.eventsphere.college.model.College;
import com.vansh.eventsphere.eventsphere.college.model.CollegeAdminAssignment;
import com.vansh.eventsphere.eventsphere.college.model.CollegeAffiliationRequest;
import com.vansh.eventsphere.eventsphere.college.service.CollegeVerificationService;
import com.vansh.eventsphere.eventsphere.college.service.DocumentStorageService;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/colleges")
@RequiredArgsConstructor
@Slf4j
public class CollegeVerificationController {

    private final CollegeVerificationService collegeVerificationService;
    private final UserRepository userRepository;
    private final DocumentStorageService documentStorageService;

    // Public: Submit college application
    @PostMapping("/applications")
    @ResponseStatus(HttpStatus.CREATED)
    public CollegeApplicationResponse submitApplication(
            @Valid @RequestBody CollegeApplicationRequest request) {
        return collegeVerificationService.submitApplication(request);
    }

    // Public: Send domain OTP for college application
    @PostMapping("/applications/{applicationId}/domain-otp")
    public void sendDomainOTP(
            @PathVariable String applicationId,
            @Valid @RequestBody DomainOTPRequest request) {
        collegeVerificationService.sendDomainOTP(applicationId, request.getEmail(), request.getDomain());
    }

    // Public: Verify domain OTP for college application
    @PostMapping("/applications/{applicationId}/domain-otp/verify")
    public void verifyDomainOTP(
            @PathVariable String applicationId,
            @Valid @RequestBody VerifyDomainOTPRequest request,
            Authentication authentication) {
        // Get email from authenticated user or request body
        String email = authentication != null ? authentication.getName() : request.getEmail();
        // Actually we need to pass email from the request
        // Let's use a different approach - the email should come from the challenge
        collegeVerificationService.verifyDomainOTP(applicationId, email, request.getOtp());
    }

    // Super Admin: List pending applications
    @GetMapping("/super-admin/applications/pending")
    public Page<CollegeApplicationResponse> listPendingApplications(Authentication authentication, Pageable pageable) {
        verifySuperAdmin(authentication);
        return collegeVerificationService.listPendingApplications(pageable);
    }

    // Super Admin: Get application details
    @GetMapping("/super-admin/applications/{applicationId}")
    public CollegeApplicationResponse getApplicationDetails(
            @PathVariable String applicationId,
            Authentication authentication) {
        verifySuperAdmin(authentication);
        return collegeVerificationService.getApplicationDetails(applicationId);
    }

    // Super Admin: Approve application
    @PostMapping("/super-admin/applications/{applicationId}/approve")
    public CollegeApplicationResponse approveApplication(
            @PathVariable String applicationId,
            Authentication authentication) {
        verifySuperAdmin(authentication);
        String superAdminId = getUserId(authentication);
        return collegeVerificationService.approveApplication(applicationId, superAdminId);
    }

    // Super Admin: Reject application
    @PostMapping("/super-admin/applications/{applicationId}/reject")
    public CollegeApplicationResponse rejectApplication(
            @PathVariable String applicationId,
            @RequestParam String reason,
            Authentication authentication) {
        verifySuperAdmin(authentication);
        String superAdminId = getUserId(authentication);
        return collegeVerificationService.rejectApplication(applicationId, superAdminId, reason);
    }

    // Super Admin: Assign initial College Admin
    @PostMapping("/super-admin/colleges/{collegeId}/admin")
    public CollegeAdminAssignment assignCollegeAdmin(
            @PathVariable String collegeId,
            @Valid @RequestBody AssignCollegeAdminRequest request,
            Authentication authentication) {
        verifySuperAdmin(authentication);
        String superAdminId = getUserId(authentication);
        return collegeVerificationService.assignInitialCollegeAdmin(collegeId, request, superAdminId);
    }

    // Super Admin: Download institution documents
    @GetMapping("/super-admin/applications/{applicationId}/documents/{documentId}")
    public ResponseEntity<org.springframework.core.io.Resource> downloadInstitutionDocument(
            @PathVariable String applicationId,
            @PathVariable String documentId,
            Authentication authentication) {
        verifySuperAdmin(authentication);
        // Implementation would retrieve document metadata and serve it
        throw new UnsupportedOperationException("Document download not yet implemented");
    }

    // College Admin: List affiliation requests
    @GetMapping("/college-admin/affiliation-requests")
    public List<CollegeAffiliationRequest> getAffiliationRequests(
            @RequestParam String collegeId,
            Authentication authentication) {
        String userId = getUserId(authentication);
        return collegeVerificationService.getAffiliationRequests(collegeId, userId);
    }

    // College Admin: Approve affiliation request
    @PostMapping("/college-admin/affiliation-requests/{requestId}/approve")
    public CollegeAffiliationRequest approveAffiliationRequest(
            @PathVariable String requestId,
            Authentication authentication) {
        String userId = getUserId(authentication);
        return collegeVerificationService.approveAffiliationRequest(requestId, userId);
    }

    // College Admin: Reject affiliation request
    @PostMapping("/college-admin/affiliation-requests/{requestId}/reject")
    public CollegeAffiliationRequest rejectAffiliationRequest(
            @PathVariable String requestId,
            @RequestParam String reason,
            Authentication authentication) {
        String userId = getUserId(authentication);
        return collegeVerificationService.rejectAffiliationRequest(requestId, userId, reason);
    }

    // College Admin: Download affiliation documents
    @GetMapping("/college-admin/affiliation-requests/{requestId}/documents")
    public ResponseEntity<org.springframework.core.io.Resource> downloadAffiliationDocument(
            @PathVariable String requestId,
            Authentication authentication) {
        String userId = getUserId(authentication);
        // Implementation
        throw new UnsupportedOperationException("Document download not yet implemented");
    }

    // Participant: Send student affiliation OTP
    @PostMapping("/participant/college-affiliation/domain-otp")
    public void sendStudentAffiliationOTP(Authentication authentication) {
        String userId = getUserId(authentication);
        collegeVerificationService.sendStudentAffiliationOTP(userId);
    }

    // Participant: Verify student affiliation OTP
    @PostMapping("/participant/college-affiliation/domain-otp/verify")
    public void verifyStudentAffiliationOTP(
            @RequestParam String otp,
            Authentication authentication) {
        String userId = getUserId(authentication);
        collegeVerificationService.verifyStudentAffiliationOTP(userId, otp);
    }

    // Participant: Submit manual affiliation request
    @PostMapping("/participant/college-affiliation/requests")
    public CollegeAffiliationRequest submitManualAffiliationRequest(
            @RequestParam String studentIdentifier,
            @RequestParam(required = false) String course,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) MultipartFile document,
            Authentication authentication) {
        String userId = getUserId(authentication);
        String documentPath = null;
        if (document != null && !document.isEmpty()) {
            // Store document
            documentPath = documentStorageService.store(document).getStoragePath();
        }
        return collegeVerificationService.submitManualAffiliationRequest(userId, studentIdentifier, course, department, documentPath);
    }

    // Participant: Get own affiliation status
    @GetMapping("/participant/college-affiliation/me")
    public CollegeAffiliationRequest getMyAffiliationStatus(Authentication authentication) {
        String userId = getUserId(authentication);
        return collegeVerificationService.getMyAffiliationRequest(userId);
    }

    private void verifySuperAdmin(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getRole() != com.vansh.eventsphere.eventsphere.user.model.Role.SUPER_ADMIN) {
            throw new IllegalArgumentException("Super Admin access required");
        }
    }

    private String getUserId(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return user.getUserId();
    }
}