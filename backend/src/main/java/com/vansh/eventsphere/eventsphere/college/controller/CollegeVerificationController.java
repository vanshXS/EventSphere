package com.vansh.eventsphere.eventsphere.college.controller;

import java.util.List;
import java.util.ArrayList;

import com.vansh.eventsphere.eventsphere.college.model.StoredDocument;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

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

    /** Manual institutional applications retain the JSON endpoint while accepting private documents via multipart. */
    @PostMapping(value = "/applications/manual", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CollegeApplicationResponse submitManualApplication(
            @RequestParam String name, @RequestParam String code,
            @RequestParam(required = false) String officialWebsite, @RequestParam(required = false) String address,
            @RequestParam(required = false) String initialAdminEmail,
            @RequestParam("documents") List<MultipartFile> documents) {
        if (documents == null || documents.isEmpty()) throw new BadRequestException("At least one institutional document is required");
        CollegeApplicationRequest request = new CollegeApplicationRequest();
        request.setName(name); request.setCode(code); request.setOfficialWebsite(officialWebsite); request.setAddress(address);
        request.setInitialAdminEmail(initialAdminEmail);
        request.setVerificationMode(com.vansh.eventsphere.eventsphere.college.model.CollegeVerificationMode.MANUAL_DOCUMENTS);
        List<StoredDocument> stored = new ArrayList<>();
        for (MultipartFile document : documents) {
            if (document == null || document.isEmpty()) throw new BadRequestException("Institutional documents cannot be empty");
            stored.add(documentStorageService.store(document));
        }
        return collegeVerificationService.submitApplication(request, stored);
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
            @Valid @RequestBody VerifyDomainOTPRequest request) {
        collegeVerificationService.verifyDomainOTP(applicationId, request.getEmail(), request.getOtp());
    }

    @PostMapping(value = "/applications/{applicationId}/nominee", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CollegeApplicationResponse nominateInitialAdmin(@PathVariable String applicationId,
            @RequestParam String name, @RequestParam String email, @RequestParam String contactNumber,
            @RequestParam String designation, @RequestParam MultipartFile authorizationDocument) {
        if (authorizationDocument == null || authorizationDocument.isEmpty()) throw new BadRequestException("Authorization document is required");
        return collegeVerificationService.nominateInitialAdmin(applicationId, name, email, contactNumber, designation,
                documentStorageService.store(authorizationDocument));
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
        StoredDocument document = collegeVerificationService.getInstitutionDocument(applicationId, documentId);
        return documentResponse(document);
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
    public ResponseEntity<Resource> downloadAffiliationDocument(
            @PathVariable String requestId,
            Authentication authentication
    ) {
        String userId = getUserId(authentication);

        CollegeAffiliationRequest request =
                collegeVerificationService.getAffiliationRequestForDocument(
                        requestId,
                        userId
                );

        Resource resource = documentStorageService.load(
                request.getSupportingDocumentStorageName()
        );

        MediaType contentType;

        try {
            contentType = MediaType.parseMediaType(
                    request.getSupportingDocumentContentType()
            );
        } catch (Exception e) {
            contentType = MediaType.APPLICATION_OCTET_STREAM;
        }

        String filename = request.getSupportingDocumentOriginalFilename();

        return ResponseEntity.ok()
                .contentType(contentType)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(filename, StandardCharsets.UTF_8)
                                .build()
                                .toString()
                )
                .body(resource);
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
            @RequestParam MultipartFile document,
            Authentication authentication) {
        String userId = getUserId(authentication);
       if(document == null || document.isEmpty()) {
           throw new BadRequestException("Supporting document is required.");
       }

        StoredDocument storedDocument = documentStorageService.store(document);

        return collegeVerificationService.submitManualAffiliationRequest(userId, studentIdentifier, course, department, storedDocument);
    }

    @PostMapping("/super-admin/applications/{applicationId}/nominee/reject")
    public CollegeApplicationResponse rejectNominee(@PathVariable String applicationId, @RequestParam String reason,
            Authentication authentication) {
        verifySuperAdmin(authentication);
        return collegeVerificationService.rejectNominee(applicationId, getUserId(authentication), reason);
    }

    @GetMapping("/super-admin/applications/{applicationId}/nominee-document")
    public ResponseEntity<Resource> downloadNomineeDocument(@PathVariable String applicationId, Authentication authentication) {
        verifySuperAdmin(authentication);
        return documentResponse(collegeVerificationService.getNomineeAuthorizationDocument(applicationId));
    }

    @PostMapping(value = "/organizer/college-affiliation/requests", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public com.vansh.eventsphere.eventsphere.college.model.OrganizerAffiliationRequest submitOrganizerAffiliationRequest(
            @RequestParam String staffIdentifier, @RequestParam(required = false) String department,
            @RequestParam(required = false) String designation, @RequestParam MultipartFile document,
            Authentication authentication) {
        if (document == null || document.isEmpty()) throw new BadRequestException("Supporting document is required");
        return collegeVerificationService.submitOrganizerAffiliationRequest(getUserId(authentication), staffIdentifier, department, designation,
                documentStorageService.store(document));
    }

    @GetMapping("/college-admin/organizer-affiliation-requests")
    public List<com.vansh.eventsphere.eventsphere.college.model.OrganizerAffiliationRequest> getOrganizerAffiliationRequests(
            @RequestParam String collegeId, Authentication authentication) {
        return collegeVerificationService.getOrganizerAffiliationRequests(collegeId, getUserId(authentication));
    }

    @PostMapping("/college-admin/organizer-affiliation-requests/{requestId}/approve")
    public com.vansh.eventsphere.eventsphere.college.model.OrganizerAffiliationRequest approveOrganizerAffiliationRequest(
            @PathVariable String requestId, Authentication authentication) {
        return collegeVerificationService.reviewOrganizerAffiliationRequest(requestId, getUserId(authentication), true, null);
    }

    @PostMapping("/college-admin/organizer-affiliation-requests/{requestId}/reject")
    public com.vansh.eventsphere.eventsphere.college.model.OrganizerAffiliationRequest rejectOrganizerAffiliationRequest(
            @PathVariable String requestId, @RequestParam String reason, Authentication authentication) {
        return collegeVerificationService.reviewOrganizerAffiliationRequest(requestId, getUserId(authentication), false, reason);
    }

    @GetMapping("/college-admin/organizer-affiliation-requests/{requestId}/documents")
    public ResponseEntity<Resource> downloadOrganizerAffiliationDocument(@PathVariable String requestId, Authentication authentication) {
        var request = collegeVerificationService.getOrganizerAffiliationRequestForDocument(requestId, getUserId(authentication));
        return documentResponse(request.getSupportingDocument());
    }

    // Participant: Get own affiliation status
    @GetMapping("/participant/college-affiliation/me")
    public CollegeAffiliationRequest getMyAffiliationStatus(Authentication authentication) {
        String userId = getUserId(authentication);
        return collegeVerificationService.getMyAffiliationRequest(userId);
    }

    private User resolveAuthenticatedUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalArgumentException("Authentication required");
        }
        String principal = authentication.getName();
        return userRepository.findById(principal)
                .or(() -> userRepository.findByEmail(principal))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private void verifySuperAdmin(Authentication authentication) {
        User user = resolveAuthenticatedUser(authentication);
        if (user.getRole() != com.vansh.eventsphere.eventsphere.user.model.Role.SUPER_ADMIN) {
            throw new IllegalArgumentException("Super Admin access required");
        }
    }

    private String getUserId(Authentication authentication) {
        User user = resolveAuthenticatedUser(authentication);
        return user.getUserId();
    }

    private ResponseEntity<Resource> documentResponse(StoredDocument document) {
        MediaType contentType;
        try { contentType = MediaType.parseMediaType(document.getContentType()); }
        catch (Exception ignored) { contentType = MediaType.APPLICATION_OCTET_STREAM; }
        return ResponseEntity.ok().contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(document.getOriginalFilename(), StandardCharsets.UTF_8).build().toString())
                .body(documentStorageService.load(document.getStoragePath()));
    }
}
