package com.vansh.eventsphere.eventsphere.college.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.security.SecureRandom;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import com.vansh.eventsphere.eventsphere.college.model.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vansh.eventsphere.eventsphere.college.dto.AssignCollegeAdminRequest;
import com.vansh.eventsphere.eventsphere.college.dto.CollegeApplicationRequest;
import com.vansh.eventsphere.eventsphere.college.dto.CollegeApplicationResponse;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeAdminAssignmentRepository;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeAffiliationRequestRepository;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeApplicationRepository;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeRepository;
import com.vansh.eventsphere.eventsphere.college.repository.OrganizerAffiliationRequestRepository;
import com.vansh.eventsphere.eventsphere.college.repository.CollegeAdminInvitationRepository;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CollegeVerificationService {

    private final CollegeApplicationRepository collegeApplicationRepository;
    private final CollegeRepository collegeRepository;
    private final CollegeAdminAssignmentRepository collegeAdminAssignmentRepository;
    private final CollegeAffiliationRequestRepository collegeAffiliationRequestRepository;
    private final OrganizerAffiliationRequestRepository organizerAffiliationRequestRepository;
    private final CollegeAdminInvitationRepository collegeAdminInvitationRepository;
    private final UserRepository userRepository;
    private final OTPService otpService;
    private final EmailService emailService;
    private final DocumentStorageService documentStorageService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Value("${app.frontend-url}")
    private String frontendUrl;

    private static final String OTP_PURPOSE_COLLEGE_DOMAIN = "COLLEGE_DOMAIN_VERIFICATION";
    private static final String OTP_PURPOSE_STUDENT_AFFILIATION = "STUDENT_AFFILIATION_VERIFICATION";
    private static final SecureRandom INVITATION_RANDOM = new SecureRandom();

    // Public: Submit college application
    @Transactional
    public CollegeApplicationResponse submitApplication(CollegeApplicationRequest request) {
        return submitApplication(request, List.of());
    }

    @Transactional
    public CollegeApplicationResponse submitApplication(CollegeApplicationRequest request, List<StoredDocument> supportingDocuments) {
        validateApplication(request);

        String normalizedCode = request.getCode().trim().toUpperCase();
        if (collegeRepository.existsByCode(normalizedCode)
                || collegeApplicationRepository.existsByCode(normalizedCode)) {
            throw new BadRequestException("College code already exists");
        }

        if (request.getVerificationMode() == CollegeVerificationMode.OFFICIAL_DOMAIN) {
            String normalizedDomain = normalizeDomain(request.getProposedDomain());
            if (normalizedDomain == null) {
                throw new BadRequestException("Invalid proposed domain");
            }
            if (collegeRepository.existsByVerifiedDomainsContaining(normalizedDomain)) {
                throw new BadRequestException("This domain is already verified for another college");
            }
            if (collegeApplicationRepository.findByProposedDomain(normalizedDomain).isPresent()) {
                throw new BadRequestException("This domain is already proposed by another college application");
            }

            String normalizedContactEmail = request.getDomainContactEmail().trim().toLowerCase();
            if (!normalizedContactEmail.endsWith("@" + normalizedDomain)) {
                throw new BadRequestException("Official contact email must belong to the proposed domain");
            }
        }
        if (request.getVerificationMode() == CollegeVerificationMode.MANUAL_DOCUMENTS
                && (supportingDocuments == null || supportingDocuments.isEmpty())) {
            throw new BadRequestException("At least one institutional supporting document is required");
        }

        CollegeApplication application = CollegeApplication.builder()
                .name(request.getName().trim())
                .code(normalizedCode)
                .officialWebsite(request.getOfficialWebsite() != null ? request.getOfficialWebsite().trim() : null)
                .address(request.getAddress() != null ? request.getAddress().trim() : null)
                .verificationMode(request.getVerificationMode())
                .proposedDomain(request.getVerificationMode() == CollegeVerificationMode.OFFICIAL_DOMAIN
                        ? normalizeDomain(request.getProposedDomain())
                        : null)
                .domainContactEmail(request.getVerificationMode() == CollegeVerificationMode.OFFICIAL_DOMAIN
                        ? request.getDomainContactEmail().trim().toLowerCase()
                        : null)
                .initialAdminEmail(request.getInitialAdminEmail() != null
                        ? request.getInitialAdminEmail().trim().toLowerCase()
                        : null)
                .supportingDocuments(supportingDocuments == null ? List.of() : List.copyOf(supportingDocuments))
                .verificationStatus(CollegeVerificationStatus.PENDING_VERIFICATION)
                .submittedAt(LocalDateTime.now())
                .submittedByEmail(request.getVerificationMode() == CollegeVerificationMode.OFFICIAL_DOMAIN
                        ? request.getDomainContactEmail().trim().toLowerCase()
                        : null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        CollegeApplication saved = collegeApplicationRepository.save(application);
        log.info("College application submitted: {} ({})", saved.getName(), saved.getCode());
        return toResponse(saved);
    }

    // Keep application and nominee creation in the same MongoDB transaction.
    @Transactional
    public CollegeApplicationResponse submitManualApplication(CollegeApplicationRequest request, List<StoredDocument> documents,
            String name, String email, String phone, String designation, StoredDocument authorization) {
        CollegeApplicationResponse application = submitApplication(request, documents);
        return nominateInitialAdmin(application.getId(), name, email, phone, designation, authorization);
    }

    // Public: Search verified colleges only
    public List<College> searchVerifiedColleges(String query) {
        List<College> verified = collegeRepository.findByVerificationStatus(CollegeVerificationStatus.VERIFIED);
        String lowerQuery = query.toLowerCase();
        return verified.stream()
                .filter(c -> c.getName().toLowerCase().contains(lowerQuery)
                        || c.getCode().toLowerCase().contains(lowerQuery))
                .toList();
    }

    // Public: Send domain OTP for college application
    @Transactional
    public void sendDomainOTP(
            String applicationId,
            String email,
            String domain
    ) {
        CollegeApplication application = collegeApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("College application not found"));

        if (application.getVerificationStatus() != CollegeVerificationStatus.PENDING_VERIFICATION) {
            throw new BadRequestException("Application is not pending verification");
        }

        if (application.getVerificationMode() != CollegeVerificationMode.OFFICIAL_DOMAIN) {
            throw new BadRequestException("This application does not use official domain verification");
        }

        String normalizedEmail = email.trim().toLowerCase();
        String normalizedDomain = normalizeDomain(domain);

        if (normalizedDomain == null) {
            throw new BadRequestException("Invalid domain");
        }

        if (!normalizedEmail.endsWith("@" + normalizedDomain)) {
            throw new BadRequestException("Email must belong to the proposed domain");
        }

        if (!normalizedDomain.equals(normalizeDomain(application.getProposedDomain()))) {
            throw new BadRequestException("Domain does not match the application");
        }

        if (!normalizedEmail.equals(application.getDomainContactEmail())) {
            throw new BadRequestException("Email does not match the registered contact email");
        }

        Optional<OTPChallenge> existingChallenge = otpService.findLatestChallenge(
                applicationId,
                normalizedEmail,
                OTP_PURPOSE_COLLEGE_DOMAIN
        );

        if (existingChallenge.isPresent()
                && !otpService.canResend(existingChallenge.get())) {
            throw new BadRequestException("Please wait 60 seconds before requesting another OTP");
        }

        otpService.invalidateChallenge(
                applicationId,
                normalizedEmail,
                OTP_PURPOSE_COLLEGE_DOMAIN
        );

        OTPService.GeneratedOTP generated = otpService.createChallenge(
                applicationId,
                normalizedEmail,
                OTP_PURPOSE_COLLEGE_DOMAIN
        );

        try {
            emailService.sendCollegeDomainOTP(
                    normalizedEmail,
                    normalizedDomain,
                    generated.rawOtp()
            );

        } catch (Exception e) {
            otpService.deleteChallenge(generated.challenge());

            throw new BadRequestException(
                    "Failed to send verification email. Please try again later."
            );
        }
    }

    // Public: Verify domain OTP for college application
    @Transactional(noRollbackFor =  BadRequestException.class)
    public void verifyDomainOTP(
            String applicationId,
            String email,
            String otp
    ) {
        CollegeApplication application = collegeApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("College application not found"));

        if (application.getVerificationStatus() != CollegeVerificationStatus.PENDING_VERIFICATION) {
            throw new BadRequestException("Application is not pending verification");
        }

        if (application.getVerificationMode() != CollegeVerificationMode.OFFICIAL_DOMAIN) {
            throw new BadRequestException("This application does not use official domain verification");
        }

        String targetEmail = (email != null && !email.trim().isEmpty())
                ? email.trim().toLowerCase()
                : application.getDomainContactEmail();

        if (targetEmail == null || !targetEmail.equals(application.getDomainContactEmail())) {
            throw new BadRequestException("Email does not match the registered contact email");
        }

        Optional<OTPChallenge> challengeOpt = otpService.findValidChallenge(
                applicationId,
                targetEmail,
                OTP_PURPOSE_COLLEGE_DOMAIN
        );

        if (challengeOpt.isEmpty()) {
            throw new BadRequestException("Invalid or expired OTP challenge");
        }

        OTPChallenge challenge = challengeOpt.get();

        if (!otpService.verifyOTP(challenge, otp)) {

            int remaining = challenge.getMaxAttempts() - challenge.getAttempts();

            if (remaining <= 0) {
                otpService.deleteChallenge(challenge);
                throw new BadRequestException("Maximum OTP attempts exceeded. Request a new code.");
            }

            throw new BadRequestException(
                    "Invalid OTP. Attempts remaining: " + remaining
            );
        }

        // Do not reject a correct OTP just because it was the fifth attempt.
        application.setDomainOwnershipVerifiedAt(LocalDateTime.now());
        application.setDomainVerificationToken(challenge.getId());
        application.setUpdatedAt(LocalDateTime.now());

        collegeApplicationRepository.save(application);

        otpService.deleteChallenge(challenge);

        log.info("Domain ownership verified for application: {}", applicationId);
    }

    // Super Admin: List pending applications
    public Page<CollegeApplicationResponse> listPendingApplications(Pageable pageable) {
        return collegeApplicationRepository
                .findByVerificationStatus(CollegeVerificationStatus.PENDING_VERIFICATION, pageable)
                .map(this::toResponse);
    }

    public Page<CollegeApplicationResponse> listApprovedApplications(Pageable pageable) {
        return collegeApplicationRepository.findByVerificationStatus(CollegeVerificationStatus.VERIFIED, pageable).map(this::toResponse);
    }

    @Transactional
    public void resendCollegeAdminInvitation(String applicationId) {
        CollegeApplication app = collegeApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("College application not found"));
        if (app.getVerificationStatus() != CollegeVerificationStatus.VERIFIED || !"APPROVED".equals(app.getNomineeStatus()))
            throw new BadRequestException("No approved administrator invitation for this application");
        if (userRepository.existsByEmail(app.getInitialAdminEmail()))
            throw new BadRequestException("An account already exists for this nominee");
        College college = collegeRepository.findByCode(app.getCode()).orElseThrow(() -> new ResourceNotFoundException("College not found"));
        if (frontendUrl == null || frontendUrl.isBlank()) throw new BadRequestException("Frontend URL is not configured");
        collegeAdminInvitationRepository.deleteByApplicationIdAndAcceptedAtIsNull(applicationId);
        String token = newInvitationToken();
        collegeAdminInvitationRepository.save(CollegeAdminInvitation.builder().applicationId(applicationId)
                .collegeId(college.getId()).nomineeEmail(app.getInitialAdminEmail()).tokenHash(hashInvitation(token))
                .createdAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusDays(7)).build());
        try { emailService.sendCollegeAdminInvitation(app.getInitialAdminEmail(), college.getName(),
                frontendUrl.replaceAll("/+$", "") + "/college-admin/accept?token=" + token); }
        catch (Exception ex) { throw new BadRequestException("Could not send invitation. Check mail configuration and retry."); }
    }

    // Super Admin: Get application details
    public CollegeApplicationResponse getApplicationDetails(String applicationId) {
        CollegeApplication application = collegeApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("College application not found"));
        return toResponse(application);
    }

    public StoredDocument getInstitutionDocument(String applicationId, String documentId) {
        CollegeApplication application = collegeApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("College application not found"));
        if (application.getSupportingDocuments() == null) throw new ResourceNotFoundException("Institutional document not found");
        return application.getSupportingDocuments().stream()
                .filter(document -> document.getStoragePath() != null && document.getStoragePath().equals(documentId))
                .findFirst().orElseThrow(() -> new ResourceNotFoundException("Institutional document not found"));
    }

    public StoredDocument getNomineeAuthorizationDocument(String applicationId) {
        CollegeApplication application = collegeApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("College application not found"));
        if (application.getNomineeAuthorizationDocument() == null) throw new ResourceNotFoundException("Nominee authorization document not found");
        return application.getNomineeAuthorizationDocument();
    }

    @Transactional
    public CollegeApplicationResponse nominateInitialAdmin(String applicationId, String name, String email, String phone,
            String designation, StoredDocument document) {
        CollegeApplication app = collegeApplicationRepository.findById(applicationId).orElseThrow(() -> new ResourceNotFoundException("College application not found"));
        if (app.getVerificationStatus() != CollegeVerificationStatus.PENDING_VERIFICATION) throw new BadRequestException("Application is not pending");
        if (name == null || name.isBlank() || designation == null || designation.isBlank() || document == null) throw new BadRequestException("Nominee name, designation and authorization document are required");
        if (email == null || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) throw new BadRequestException("A valid nominee email is required");
        if (phone == null || !phone.replaceAll("[\\s()+-]", "").matches("^[0-9]{7,15}$")) throw new BadRequestException("A valid nominee contact number is required");
        app.setNomineeName(name.trim()); app.setInitialAdminEmail(email.trim().toLowerCase()); app.setNomineeContactNumber(phone.trim());
        app.setNomineeDesignation(designation.trim()); app.setNomineeAuthorizationDocument(document); app.setNomineeStatus("PENDING");
        app.setNomineeRejectionReason(null); app.setUpdatedAt(LocalDateTime.now());
        return toResponse(collegeApplicationRepository.save(app));
    }

    @Transactional
    public CollegeApplicationResponse rejectNominee(String applicationId, String adminId, String reason) {
        CollegeApplication app = collegeApplicationRepository.findById(applicationId).orElseThrow(() -> new ResourceNotFoundException("College application not found"));
        if (reason == null || reason.isBlank()) throw new BadRequestException("Rejection reason is required");
        app.setNomineeStatus("REJECTED"); app.setNomineeReviewedBy(adminId); app.setNomineeReviewedAt(LocalDateTime.now()); app.setNomineeRejectionReason(reason.trim());
        return toResponse(collegeApplicationRepository.save(app));
    }

    @Transactional
    public void acceptCollegeAdminInvitation(String rawToken, String password) {
        CollegeAdminInvitation invitation = collegeAdminInvitationRepository.findByTokenHash(hashInvitation(rawToken))
                .orElseThrow(() -> new BadRequestException("Invalid invitation"));
        if (invitation.getAcceptedAt() != null || invitation.getExpiresAt().isBefore(LocalDateTime.now())) throw new BadRequestException("Invitation is expired or already used");
        if (userRepository.existsByEmail(invitation.getNomineeEmail())) throw new BadRequestException("An account already exists for this invitation email; contact Super Admin");
        CollegeApplication application = collegeApplicationRepository.findById(invitation.getApplicationId())
                .orElseThrow(() -> new BadRequestException("Invitation application not found"));
        User admin = User.builder().name(application.getNomineeName() == null ? "College Admin" : application.getNomineeName()).email(invitation.getNomineeEmail()).password(passwordEncoder.encode(password))
                .role(Role.COLLEGE_ADMIN).collegeId(invitation.getCollegeId()).active(true).emailVerified(true).createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        User saved = userRepository.save(admin);
        collegeAdminAssignmentRepository.save(CollegeAdminAssignment.builder().userId(saved.getUserId()).collegeId(invitation.getCollegeId())
                .permissions(List.of("REVIEW_STUDENT_AFFILIATION", "REVIEW_ORGANIZER_AFFILIATION", "VIEW_AFFILIATION_DOCUMENTS"))
                .status(CollegeAdminAssignmentStatus.ACTIVE.name()).assignedAt(LocalDateTime.now()).build());
        invitation.setAcceptedAt(LocalDateTime.now()); collegeAdminInvitationRepository.save(invitation);
    }

    // Super Admin: Approve application
    @Transactional
    public CollegeApplicationResponse approveApplication(String applicationId, String superAdminId) {
        CollegeApplication application = collegeApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("College application not found"));

        if (application.getVerificationStatus() != CollegeVerificationStatus.PENDING_VERIFICATION) {
            throw new BadRequestException("Application is not pending verification");
        }

        if (application.getVerificationMode() == CollegeVerificationMode.OFFICIAL_DOMAIN) {
            if (application.getDomainOwnershipVerifiedAt() == null) {
                throw new BadRequestException("Domain ownership must be verified before approval");
            }
            String normalizedDomain = normalizeDomain(application.getProposedDomain());
            if (collegeRepository.existsByVerifiedDomainsContaining(normalizedDomain)) {
                throw new BadRequestException("Domain already verified for another college");
            }
        }
        if (application.getVerificationMode() == CollegeVerificationMode.MANUAL_DOCUMENTS) {
            if (application.getSupportingDocuments() == null || application.getSupportingDocuments().isEmpty()) {
                throw new BadRequestException("Institution supporting documents are required for manual approval");
            }
            if (!"PENDING".equals(application.getNomineeStatus()) || application.getNomineeAuthorizationDocument() == null) {
                throw new BadRequestException("A pending administrator nomination with authorization is required for manual applications");
            }
        }
        if (application.getNomineeStatus() != null && !"PENDING".equals(application.getNomineeStatus())) {
            throw new BadRequestException("The nominated administrator is not eligible for approval");
        }

        // Create College entity
        College college = College.builder()
                .name(application.getName())
                .code(application.getCode())
                .verificationStatus(CollegeVerificationStatus.VERIFIED)
                .verificationMode(application.getVerificationMode())
                .proposedDomain(application.getProposedDomain())
                .verifiedDomains(application.getVerificationMode() == CollegeVerificationMode.OFFICIAL_DOMAIN
                        ? List.of(normalizeDomain(application.getProposedDomain()))
                        : List.of())
                .domainContactEmail(application.getDomainContactEmail())
                .domainOwnershipVerifiedAt(application.getDomainOwnershipVerifiedAt())
                .submittedByEmail(application.getSubmittedByEmail())
                .submittedAt(application.getSubmittedAt())
                .reviewedBy(superAdminId)
                .reviewedAt(LocalDateTime.now())
                .initialAdminEmail(application.getInitialAdminEmail())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        College savedCollege = collegeRepository.save(college);

        application.setVerificationStatus(CollegeVerificationStatus.VERIFIED);
        if (application.getNomineeStatus() != null) {
            if (userRepository.existsByEmail(application.getInitialAdminEmail())) {
                throw new BadRequestException("The nominee email already has an account; use a different admin email.");
            }
            application.setNomineeStatus("APPROVED");
            application.setNomineeReviewedBy(superAdminId);
            application.setNomineeReviewedAt(LocalDateTime.now());
            String invitationToken = newInvitationToken();
            collegeAdminInvitationRepository.save(CollegeAdminInvitation.builder()
                    .applicationId(application.getId()).collegeId(savedCollege.getId())
                    .nomineeEmail(application.getInitialAdminEmail()).tokenHash(hashInvitation(invitationToken))
                    .createdAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusDays(7)).build());
            if (frontendUrl == null || frontendUrl.isBlank()) throw new BadRequestException("Frontend URL is not configured");
            try {
                emailService.sendCollegeAdminInvitation(application.getInitialAdminEmail(), savedCollege.getName(),
                        frontendUrl.replaceAll("/+$", "") + "/college-admin/accept?token=" + invitationToken);
            } catch (Exception ex) {
                log.warn("Invitation email failed for college application {}", applicationId, ex);
                throw new BadRequestException("Could not send the administrator invitation. Check mail configuration and retry approval.");
            }
        }
        application.setReviewedBy(superAdminId);
        application.setReviewedAt(LocalDateTime.now());
        application.setUpdatedAt(LocalDateTime.now());
        collegeApplicationRepository.save(application);

        log.info("College application approved: {} (College ID: {})", savedCollege.getName(), savedCollege.getId());
        return toResponse(application);
    }

    // Super Admin: Reject application
    @Transactional
    public CollegeApplicationResponse rejectApplication(String applicationId, String superAdminId, String reason) {
        CollegeApplication application = collegeApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("College application not found"));

        if (application.getVerificationStatus() != CollegeVerificationStatus.PENDING_VERIFICATION) {
            throw new BadRequestException("Application is not pending verification");
        }

        if (reason == null || reason.trim().isEmpty()) {
            throw new BadRequestException("Rejection reason is required");
        }

        application.setVerificationStatus(CollegeVerificationStatus.REJECTED);
        application.setReviewedBy(superAdminId);
        application.setReviewedAt(LocalDateTime.now());
        application.setRejectionReason(reason.trim());
        application.setUpdatedAt(LocalDateTime.now());
        collegeApplicationRepository.save(application);

        log.info("College application rejected: {} - Reason: {}", application.getName(), reason);
        return toResponse(application);
    }

    // Super Admin: Assign initial College Admin
    @Transactional
    public CollegeAdminAssignment assignInitialCollegeAdmin(String collegeId, AssignCollegeAdminRequest request, String superAdminId) {
        College college = collegeRepository.findById(collegeId)
                .orElseThrow(() -> new ResourceNotFoundException("College not found"));

        if (college.getVerificationStatus() != CollegeVerificationStatus.VERIFIED) {
            throw new BadRequestException("Can only assign admin to verified colleges");
        }

        String adminEmail = request.getEmail().trim().toLowerCase();
        if (college.getInitialAdminEmail() != null && !college.getInitialAdminEmail().equals(adminEmail)) {
            throw new BadRequestException("Admin email does not match the invited email");
        }

        // Check if user exists
        User user = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + adminEmail));

        if (user.getRole() != Role.COLLEGE_ADMIN || !collegeId.equals(user.getCollegeId())) {
            throw new BadRequestException("An existing College Admin account for this college is required; use the nomination invitation for new administrators");
        }

        // Check existing assignment
        Optional<CollegeAdminAssignment> existing = collegeAdminAssignmentRepository
                .findByUserIdAndCollegeIdAndStatus(user.getUserId(), collegeId, CollegeAdminAssignmentStatus.ACTIVE);
        if (existing.isPresent()) {
            throw new BadRequestException("User is already a College Admin for this college");
        }

        // Create assignment
        CollegeAdminAssignment assignment = CollegeAdminAssignment.builder()
                .userId(user.getUserId())
                .collegeId(collegeId)
                .permissions(request.getPermissions() != null ? request.getPermissions() : List.of(
                        "REVIEW_STUDENT_AFFILIATION", "REVIEW_ORGANIZER_AFFILIATION", "VIEW_AFFILIATION_DOCUMENTS"))
                .status(CollegeAdminAssignmentStatus.ACTIVE.name())
                .assignedBy(superAdminId)
                .assignedAt(LocalDateTime.now())
                .build();

        CollegeAdminAssignment saved = collegeAdminAssignmentRepository.save(assignment);

        // Update college
        college.setInitialAdminEmail(adminEmail);
        college.setUpdatedAt(LocalDateTime.now());
        collegeRepository.save(college);

        log.info("Assigned College Admin: {} for college: {}", user.getEmail(), college.getName());
        return saved;
    }

    // College Admin: Get affiliation requests for their college
    public List<CollegeAffiliationRequest> getAffiliationRequests(String collegeId, String userId) {
        verifyCollegeAdminAccess(userId, collegeId);
        return collegeAffiliationRequestRepository.findByCollegeId(collegeId);
    }

    // College Admin: Approve affiliation request
    @Transactional
    public CollegeAffiliationRequest approveAffiliationRequest(String requestId, String userId) {
        CollegeAffiliationRequest request = collegeAffiliationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Affiliation request not found"));

        verifyCollegeAdminAccess(userId, request.getCollegeId());

        if (!"PENDING".equals(request.getStatus())) {
            throw new BadRequestException("Request is not pending");
        }

        request.setStatus("APPROVED");
        request.setReviewedBy(userId);
        request.setReviewedAt(LocalDateTime.now());
        collegeAffiliationRequestRepository.save(request);

        // Update user's affiliation status
        User participant = userRepository.findById(request.getParticipantId())
                .orElseThrow(() -> new ResourceNotFoundException("Participant not found"));
        participant.setCollegeVerificationStatus("VERIFIED");
        participant.setCollegeVerifiedAt(LocalDateTime.now());
        participant.setCollegeVerifiedBy(userId);
        participant.setUpdatedAt(LocalDateTime.now());
        userRepository.save(participant);

        log.info("Approved affiliation request: {} for user: {}", requestId, participant.getEmail());
        return request;
    }

    // College Admin: Reject affiliation request
    @Transactional
    public CollegeAffiliationRequest rejectAffiliationRequest(String requestId, String userId, String reason) {
        CollegeAffiliationRequest request = collegeAffiliationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Affiliation request not found"));

        verifyCollegeAdminAccess(userId, request.getCollegeId());

        if (!"PENDING".equals(request.getStatus())) {
            throw new BadRequestException("Request is not pending");
        }

        if (reason == null || reason.trim().isEmpty()) {
            throw new BadRequestException("Rejection reason is required");
        }

        request.setStatus("REJECTED");
        request.setReviewedBy(userId);
        request.setReviewedAt(LocalDateTime.now());
        request.setRejectionReason(reason.trim());
        collegeAffiliationRequestRepository.save(request);

        // Update user's affiliation status
        User participant = userRepository.findById(request.getParticipantId())
                .orElseThrow(() -> new ResourceNotFoundException("Participant not found"));
        participant.setCollegeVerificationStatus("REJECTED");
        participant.setUpdatedAt(LocalDateTime.now());
        userRepository.save(participant);

        log.info("Rejected affiliation request: {} for user: {} - Reason: {}", requestId, participant.getEmail(), reason);
        return request;
    }

    // Participant: Send student affiliation OTP
    @Transactional
    public void sendStudentAffiliationOTP(String userId) {

        User participant = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (participant.getCollegeId() == null) {
            throw new BadRequestException("No college selected");
        }

        College college = collegeRepository.findById(participant.getCollegeId())
                .orElseThrow(() -> new ResourceNotFoundException("College not found"));

        if (college.getVerificationStatus() != CollegeVerificationStatus.VERIFIED) {
            throw new BadRequestException("College is not verified");
        }

        if (college.getVerificationMode() != CollegeVerificationMode.OFFICIAL_DOMAIN) {
            throw new BadRequestException("This college does not support official domain verification");
        }

        if (college.getVerifiedDomains() == null || college.getVerifiedDomains().isEmpty()) {
            throw new BadRequestException("No verified domains for this college");
        }

        String userDomain = extractDomain(participant.getEmail());

        if (userDomain == null || !college.getVerifiedDomains().contains(userDomain)) {
            throw new BadRequestException("Your email domain does not match the college's verified domain");
        }

        if ("VERIFIED".equals(participant.getCollegeVerificationStatus())) {
            throw new BadRequestException("You are already verified for this college");
        }

        Optional<OTPChallenge> existingChallenge = otpService.findLatestChallenge(
                userId,
                participant.getEmail(),
                OTP_PURPOSE_STUDENT_AFFILIATION
        );

        if (existingChallenge.isPresent()
                && !otpService.canResend(existingChallenge.get())) {
            throw new BadRequestException("Please wait 60 seconds before requesting another OTP");
        }

        otpService.invalidateChallenge(
                userId,
                participant.getEmail(),
                OTP_PURPOSE_STUDENT_AFFILIATION
        );

        OTPService.GeneratedOTP generated = otpService.createChallenge(
                userId,
                participant.getEmail(),
                OTP_PURPOSE_STUDENT_AFFILIATION
        );

        try {
            emailService.sendStudentAffiliationOTP(
                    participant.getEmail(),
                    college.getName(),
                    generated.rawOtp()
            );

        } catch (Exception e) {
            otpService.deleteChallenge(generated.challenge());

            throw new BadRequestException(
                    "Failed to send verification email. Please try again later."
            );
        }

        participant.setCollegeVerificationStatus("PENDING");
        participant.setUpdatedAt(LocalDateTime.now());

        userRepository.save(participant);
    }

    // Participant: Verify student affiliation OTP
    @Transactional(noRollbackFor =  BadRequestException.class)
    public void verifyStudentAffiliationOTP(String userId, String otp) {

        User participant = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (participant.getCollegeId() == null) {
            throw new BadRequestException("No college selected");
        }

        if ("VERIFIED".equals(participant.getCollegeVerificationStatus())) {
            throw new BadRequestException("You are already verified");
        }

        College college = collegeRepository.findById(participant.getCollegeId())
                .orElseThrow(() -> new ResourceNotFoundException("College not found"));

        if (college.getVerificationStatus() != CollegeVerificationStatus.VERIFIED
                || college.getVerificationMode() != CollegeVerificationMode.OFFICIAL_DOMAIN) {
            throw new BadRequestException("College does not support domain verification");
        }

        String userDomain = extractDomain(participant.getEmail());

        if (userDomain == null
                || college.getVerifiedDomains() == null
                || !college.getVerifiedDomains().contains(userDomain)) {
            throw new BadRequestException("Email domain does not match the college");
        }

        Optional<OTPChallenge> challengeOpt = otpService.findValidChallenge(
                userId,
                participant.getEmail(),
                OTP_PURPOSE_STUDENT_AFFILIATION
        );

        if (challengeOpt.isEmpty()) {
            throw new BadRequestException("Invalid or expired OTP challenge");
        }

        OTPChallenge challenge = challengeOpt.get();

        if (!otpService.verifyOTP(challenge, otp)) {

            int remaining = challenge.getMaxAttempts() - challenge.getAttempts();

            if (remaining <= 0) {
                otpService.deleteChallenge(challenge);
                throw new BadRequestException("Maximum OTP attempts exceeded. Request a new code.");
            }

            throw new BadRequestException(
                    "Invalid OTP. Attempts remaining: " + remaining
            );
        }

        participant.setCollegeVerificationStatus("VERIFIED");
        participant.setCollegeVerifiedAt(LocalDateTime.now());
        participant.setCollegeVerifiedBy(college.getId());
        participant.setUpdatedAt(LocalDateTime.now());

        userRepository.save(participant);

        otpService.deleteChallenge(challenge);

        log.info("Student affiliation verified for user: {}", participant.getEmail());
    }

    // Participant: Submit manual affiliation request
    @Transactional
    public CollegeAffiliationRequest submitManualAffiliationRequest(String userId, String studentIdentifier,
                                                                    String course, String department, StoredDocument document) {
        User participant = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (participant.getRole() != Role.PARTICIPANT) {
            throw new BadRequestException("Only participants can submit student affiliation requests");
        }


        if (participant.getCollegeId() == null) {
            throw new BadRequestException("No college selected");
        }

        College college = collegeRepository.findById(participant.getCollegeId())
                .orElseThrow(() -> new ResourceNotFoundException("College not found"));

        if (college.getVerificationStatus() != CollegeVerificationStatus.VERIFIED) {
            throw new BadRequestException("College is not verified");
        }

        if (college.getVerificationMode() != CollegeVerificationMode.MANUAL_DOCUMENTS) {
            throw new BadRequestException("This college does not use manual document verification");
        }

        // Check for existing pending/approved request
        long pendingCount = collegeAffiliationRequestRepository
                .countByParticipantIdAndCollegeIdAndStatusIn(userId, participant.getCollegeId(),
                        List.of("PENDING", "APPROVED"));
        if (pendingCount > 0) {
            throw new BadRequestException("You already have a pending or approved affiliation request for this college");
        }

        if (studentIdentifier == null || studentIdentifier.trim().isEmpty()) {
            throw new BadRequestException("Student identifier is required");
        }

        if(document == null || document.getStoragePath() == null || document.getStoragePath().isBlank()) {
            throw new BadRequestException("Supporting document is required.");
        }

        CollegeAffiliationRequest request = CollegeAffiliationRequest.builder()
                .participantId(userId)
                .collegeId(participant.getCollegeId())
                .studentIdentifier(studentIdentifier.trim())
                .course(course != null ? course.trim() : null)
                .department(department != null ? department.trim() : null)
                .supportingDocumentStorageName(document.getStoragePath())
                .supportingDocumentOriginalFilename(document.getOriginalFilename())
                .supportingDocumentContentType(document.getContentType())
                .supportingDocumentSize(document.getSize())
                .status("PENDING")
                .submittedAt(LocalDateTime.now())
                .build();

        CollegeAffiliationRequest saved = collegeAffiliationRequestRepository.save(request);

        participant.setCollegeVerificationStatus("PENDING");
        participant.setUpdatedAt(LocalDateTime.now());
        userRepository.save(participant);

        log.info("Manual affiliation request submitted for user: {}", participant.getEmail());
        return saved;
    }

    public CollegeAffiliationRequest getAffiliationRequestForDocument(
            String requestId,
            String userId
    ) {
        CollegeAffiliationRequest request = collegeAffiliationRequestRepository
                .findById(requestId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Affiliation request not found")
                );

        verifyCollegeAdminPermission(
                userId,
                request.getCollegeId(),
                "VIEW_AFFILIATION_DOCUMENTS"
        );

        if (request.getSupportingDocumentStorageName() == null
                || request.getSupportingDocumentStorageName().isBlank()) {
            throw new ResourceNotFoundException("Supporting document not found");
        }

        return request;
    }

    // Participant: Get own affiliation status
    public CollegeAffiliationRequest getMyAffiliationRequest(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getCollegeId() == null) return null;
        return collegeAffiliationRequestRepository
                .findFirstByParticipantIdAndCollegeIdOrderBySubmittedAtDesc(userId, user.getCollegeId())
                .orElse(null);
    }

    @Transactional
    public OrganizerAffiliationRequest submitOrganizerAffiliationRequest(String userId, String staffIdentifier,
            String department, String designation, StoredDocument document) {
        User organizer = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (organizer.getRole() != Role.ORGANIZER) throw new BadRequestException("Only organizers can submit staff affiliation requests");
        if (organizer.getCollegeId() == null) throw new BadRequestException("No college selected");
        College college = collegeRepository.findById(organizer.getCollegeId())
                .orElseThrow(() -> new ResourceNotFoundException("College not found"));
        if (college.getVerificationMode() != CollegeVerificationMode.MANUAL_DOCUMENTS) {
            throw new BadRequestException("This college uses official-domain organizer verification");
        }
        if (staffIdentifier == null || staffIdentifier.isBlank()) throw new BadRequestException("Staff or employee identifier is required");
        if (document == null || document.getStoragePath() == null || document.getStoragePath().isBlank()) {
            throw new BadRequestException("Supporting staff document is required");
        }
        if (organizerAffiliationRequestRepository.countByOrganizerIdAndCollegeIdAndStatusIn(userId, organizer.getCollegeId(), List.of("PENDING", "VERIFIED")) > 0) {
            throw new BadRequestException("You already have a pending or verified organizer affiliation request");
        }
        LocalDateTime now = LocalDateTime.now();
        OrganizerAffiliationRequest request = OrganizerAffiliationRequest.builder()
                .organizerId(userId).collegeId(organizer.getCollegeId()).staffIdentifier(staffIdentifier.trim())
                .department(trimToNull(department)).designation(trimToNull(designation)).supportingDocument(document)
                .status("PENDING").submittedAt(now).updatedAt(now).build();
        OrganizerAffiliationRequest saved = organizerAffiliationRequestRepository.save(request);
        organizer.setOrganizerAffiliationStatus("PENDING"); organizer.setUpdatedAt(now); userRepository.save(organizer);
        return saved;
    }

    public OrganizerAffiliationRequest getMyOrganizerAffiliationRequest(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getRole() != Role.ORGANIZER || user.getCollegeId() == null) return null;
        return organizerAffiliationRequestRepository.findFirstByOrganizerIdAndCollegeIdOrderBySubmittedAtDesc(userId, user.getCollegeId()).orElse(null);
    }

    public List<OrganizerAffiliationRequest> getOrganizerAffiliationRequests(String collegeId, String adminId) {
        verifyCollegeAdminPermission(adminId, collegeId, "REVIEW_ORGANIZER_AFFILIATION");
        return organizerAffiliationRequestRepository.findByCollegeId(collegeId);
    }

    @Transactional
    public OrganizerAffiliationRequest reviewOrganizerAffiliationRequest(String requestId, String adminId, boolean approved, String reason) {
        OrganizerAffiliationRequest request = organizerAffiliationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer affiliation request not found"));
        verifyCollegeAdminPermission(adminId, request.getCollegeId(), "REVIEW_ORGANIZER_AFFILIATION");
        if (!"PENDING".equals(request.getStatus())) throw new BadRequestException("Request is not pending");
        if (!approved && (reason == null || reason.isBlank())) throw new BadRequestException("Rejection reason is required");
        LocalDateTime now = LocalDateTime.now();
        request.setStatus(approved ? "VERIFIED" : "REJECTED"); request.setReviewedBy(adminId); request.setReviewedAt(now);
        request.setRejectionReason(approved ? null : reason.trim()); request.setUpdatedAt(now);
        OrganizerAffiliationRequest saved = organizerAffiliationRequestRepository.save(request);
        User organizer = userRepository.findById(request.getOrganizerId()).orElseThrow(() -> new ResourceNotFoundException("Organizer not found"));
        organizer.setOrganizerAffiliationStatus(saved.getStatus()); organizer.setOrganizerAffiliationVerifiedAt(approved ? now : null);
        organizer.setOrganizerAffiliationVerifiedBy(approved ? adminId : null); organizer.setUpdatedAt(now); userRepository.save(organizer);
        return saved;
    }

    public OrganizerAffiliationRequest getOrganizerAffiliationRequestForDocument(String requestId, String adminId) {
        OrganizerAffiliationRequest request = organizerAffiliationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer affiliation request not found"));
        verifyCollegeAdminPermission(adminId, request.getCollegeId(), "VIEW_AFFILIATION_DOCUMENTS");
        if (request.getSupportingDocument() == null) throw new ResourceNotFoundException("Supporting document not found");
        return request;
    }

    private String trimToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private String hashInvitation(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to hash invitation", e);
        }
    }

    private String newInvitationToken() {
        byte[] bytes = new byte[32];
        INVITATION_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // Helper methods
    private void validateApplication(CollegeApplicationRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new BadRequestException("College name is required");
        }
        if (request.getCode() == null || request.getCode().trim().length() < 2) {
            throw new BadRequestException("College code must be at least 2 characters");
        }
        if (request.getVerificationMode() == null) {
            throw new BadRequestException("Verification mode is required");
        }
        if (request.getVerificationMode() == CollegeVerificationMode.OFFICIAL_DOMAIN) {
            if (request.getProposedDomain() == null || request.getProposedDomain().trim().isEmpty()) {
                throw new BadRequestException("Proposed domain is required for official domain verification");
            }
            if (request.getDomainContactEmail() == null || request.getDomainContactEmail().trim().isEmpty()) {
                throw new BadRequestException("Domain contact email is required for official domain verification");
            }
        }
    }

    private String normalizeDomain(String domain) {
        if (domain == null) return null;
        String normalized = domain.trim().toLowerCase();
        if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
            try {
                normalized = new java.net.URL(normalized).getHost();
            } catch (Exception e) {
                return null;
            }
        }
        if (normalized.startsWith("www.")) {
            normalized = normalized.substring(4);
        }
        if (!normalized.matches("^[a-z0-9.-]+\\.[a-z]{2,}$")) {
            return null;
        }
        return normalized;
    }

    private String extractDomain(String email) {
        if (email == null || !email.contains("@")) return null;
        return email.substring(email.lastIndexOf("@") + 1).toLowerCase();
    }
    private void verifyCollegeAdminPermission(
            String userId,
            String collegeId,
            String requiredPermission
    ) {
        CollegeAdminAssignment assignment = collegeAdminAssignmentRepository
                .findByUserIdAndCollegeIdAndStatus(
                        userId,
                        collegeId,
                        CollegeAdminAssignmentStatus.ACTIVE
                )
                .orElseThrow(() ->
                        new BadRequestException(
                                "You are not authorized for this college"
                        )
                );

        List<String> permissions = assignment.getPermissions();

        if (permissions == null || !permissions.contains(requiredPermission)) {
            throw new BadRequestException(
                    "You do not have permission: " + requiredPermission
            );
        }
    }

    private void verifyCollegeAdminAccess(String userId, String collegeId) {
        verifyCollegeAdminPermission(
                userId,
                collegeId,
                "REVIEW_STUDENT_AFFILIATION"
        );
    }


    private CollegeApplicationResponse toResponse(CollegeApplication application) {
        CollegeApplicationResponse response = new CollegeApplicationResponse();
        response.setId(application.getId());
        response.setName(application.getName());
        response.setCode(application.getCode());
        response.setOfficialWebsite(application.getOfficialWebsite());
        response.setAddress(application.getAddress());
        response.setVerificationMode(application.getVerificationMode());
        response.setProposedDomain(application.getProposedDomain());
        response.setDomainContactEmail(application.getDomainContactEmail());
        response.setInitialAdminEmail(application.getInitialAdminEmail());
        response.setNomineeName(application.getNomineeName());
        response.setNomineeContactNumber(application.getNomineeContactNumber());
        response.setNomineeDesignation(application.getNomineeDesignation());
        response.setNomineeAuthorizationDocument(application.getNomineeAuthorizationDocument());
        response.setNomineeStatus(application.getNomineeStatus());
        response.setNomineeRejectionReason(application.getNomineeRejectionReason());
        response.setSupportingDocuments(application.getSupportingDocuments());
        response.setVerificationStatus(application.getVerificationStatus());
        response.setSubmittedByEmail(application.getSubmittedByEmail());
        response.setDomainOwnershipVerified(application.getDomainOwnershipVerifiedAt() != null);
        response.setDomainOwnershipVerifiedAt(application.getDomainOwnershipVerifiedAt() != null
                ? application.getDomainOwnershipVerifiedAt().toString() : null);
        response.setReviewedBy(application.getReviewedBy());
        response.setReviewedAt(application.getReviewedAt() != null
                ? application.getReviewedAt().toString() : null);
        response.setRejectionReason(application.getRejectionReason());
        response.setSubmittedAt(application.getSubmittedAt() != null
                ? application.getSubmittedAt().toString() : null);
        response.setCreatedAt(application.getCreatedAt() != null
                ? application.getCreatedAt().toString() : null);
        response.setUpdatedAt(application.getUpdatedAt() != null
                ? application.getUpdatedAt().toString() : null);
        return response;
    }
}
