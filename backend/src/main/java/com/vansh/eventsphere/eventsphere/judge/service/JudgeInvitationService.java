package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.judge.dto.AcceptJudgeInvitationRequest;
import com.vansh.eventsphere.eventsphere.judge.dto.InviteJudgeRequest;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeInvitationResponse;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeAssignmentStatus;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeInvitation;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeInvitationStatus;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeInvitationRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.service.validator.JudgeRoundValidator;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JudgeInvitationService {

    private static final int INVITATION_VALIDITY_DAYS = 7;
    private static final Set<JudgeInvitationStatus> OPEN_STATUSES =
            Set.of(JudgeInvitationStatus.INVITED);

    private final JudgeInvitationRepository judgeInvitationRepository;
    private final JudgingRoundRepository judgingRoundRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final ActivityRepository activityRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final JudgeRoundValidator judgeRoundValidator;
    private final PasswordEncoder passwordEncoder;
    private final TransactionRunner transactionRunner;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendBaseUrl;

    /**
     * Organizer invites a judge by email to evaluate a round.
     */
    public JudgeInvitationResponse inviteJudge(
            String roundId,
            InviteJudgeRequest request,
            String organizerId
    ) {
        if (request == null || request.getEmail() == null || request.getEmail().isBlank()) {
            throw new BadRequestException("Judge email is required.");
        }

        JudgeRound round = getAndValidateOwnedRound(roundId, organizerId);

        if (round.getStatus() != JudgingRoundStatus.DRAFT) {
            throw new BadRequestException(
                    "Judges can only be invited before a round opens."
            );
        }

        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);

        Optional<User> existingUser = userRepository.findByEmail(email);
        existingUser.ifPresent(user -> {
            if (user.getRole() != Role.JUDGE || !user.isActive()) {
                throw new BadRequestException(
                        "Only active judge accounts can be invited to a round.");
            }
        });

        if (existingUser.isPresent()
                && judgeAssignmentRepository.existsByRoundIdAndJudgeIdAndStatus(
                round.getId(),
                existingUser.get().getUserId(),
                JudgeAssignmentStatus.ACTIVE)) {
            throw new BadRequestException(
                    "This judge is already assigned to the round.");
        }

        LocalDateTime now = LocalDateTime.now();
        List<JudgeInvitation> priorInvitations =
                judgeInvitationRepository.findByRoundIdAndEmailAndStatusIn(
                round.getId(),
                email,
                OPEN_STATUSES
        );
        boolean invitationPending = false;
        for (JudgeInvitation prior : priorInvitations) {
            if (prior.getInvitationExpiresAt() == null
                    || prior.getInvitationExpiresAt().isAfter(now)) {
                invitationPending = true;
            } else {
                prior.setStatus(JudgeInvitationStatus.EXPIRED);
                judgeInvitationRepository.save(prior);
            }
        }
        if (invitationPending) {
            throw new BadRequestException(
                    "A judge invitation is already pending for this email."
            );
        }

        Activity activity = activityRepository.findById(round.getActivityId())
                .orElse(null);
        Event parentEvent = (activity != null && activity.getEventId() != null)
                ? eventRepository.findById(activity.getEventId()).orElse(null)
                : null;

        String rawToken = UUID.randomUUID().toString().replace("-", "");
        JudgeInvitation invitation = JudgeInvitation.builder()
                .roundId(round.getId())
                .activityId(activity != null ? activity.getId() : round.getActivityId())
                .eventId(parentEvent != null ? parentEvent.getId() : null)
                .organizerId(organizerId)
                .email(email)
                .invitedName(request.getName() != null ? request.getName().trim() : null)
                .status(JudgeInvitationStatus.INVITED)
                .invitationTokenHash(sha256(rawToken))
                .invitationExpiresAt(now.plusDays(INVITATION_VALIDITY_DAYS))
                .invitedAt(now)
                .build();

        JudgeInvitation saved = judgeInvitationRepository.save(invitation);

        return toResponse(
                saved,
                round,
                activity,
                parentEvent,
                rawToken
        );
    }

    /**
     * Resolves invitation details for the judge onboarding page.
     */
    public JudgeInvitationResponse getInvitation(String rawToken) {
        JudgeInvitation invitation = findValidInvitation(rawToken);

        JudgeRound round = judgingRoundRepository.findById(invitation.getRoundId())
                .orElse(null);
        Activity activity = invitation.getActivityId() != null
                ? activityRepository.findById(invitation.getActivityId()).orElse(null)
                : null;
        Event parentEvent = invitation.getEventId() != null
                ? eventRepository.findById(invitation.getEventId()).orElse(null)
                : null;

        return toResponse(invitation, round, activity, parentEvent, null);
    }

    /**
     * Accepts judge invitation and activates judge account + round assignment.
     */
    public JudgeInvitationResponse acceptInvitation(
            String rawToken,
            AcceptJudgeInvitationRequest request,
            String authenticatedUserId
    ) {
        return transactionRunner.run(() ->
                acceptInvitationInTransaction(rawToken, request, authenticatedUserId));
    }

    private JudgeInvitationResponse acceptInvitationInTransaction(
            String rawToken,
            AcceptJudgeInvitationRequest request,
            String authenticatedUserId
    ) {
        JudgeInvitation invitation = findValidInvitation(rawToken);
        transactionRunner.guard(JudgeInvitation.class, invitation.getId());

        JudgeRound round = judgingRoundRepository.findById(invitation.getRoundId())
                .orElseThrow(() -> new ResourceNotFoundException("Judging round not found."));
        if (round.getStatus() != JudgingRoundStatus.DRAFT) {
            throw new BadRequestException(
                    "This round has already opened. The invitation can no longer be accepted.");
        }

        Optional<User> existingUser = userRepository.findByEmail(invitation.getEmail());
        User judgeUser;

        LocalDateTime now = LocalDateTime.now();

        if (existingUser.isPresent()) {
            judgeUser = existingUser.get();
            if (judgeUser.getRole() != Role.JUDGE || !judgeUser.isActive()) {
                throw new BadRequestException(
                        "Only active judge accounts can accept this invitation.");
            }
            if (authenticatedUserId == null
                    || !authenticatedUserId.equals(judgeUser.getUserId())) {
                throw new BadRequestException(
                        "Sign in to the invited judge account before accepting this invitation.");
            }
        } else {
            // New user registration
            String name = request != null && request.getName() != null && !request.getName().isBlank()
                    ? request.getName().trim()
                    : (invitation.getInvitedName() != null ? invitation.getInvitedName() : "Judge");

            String password = request != null ? request.getPassword() : null;

            if (password == null || password.isBlank() || password.length() < 8) {
                throw new BadRequestException(
                        "A password with at least 8 characters is required to create your account."
                );
            }

            judgeUser = User.builder()
                    .name(name)
                    .email(invitation.getEmail())
                    .password(passwordEncoder.encode(password))
                    .role(Role.JUDGE)
                    .active(true)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();

            userRepository.save(judgeUser);
        }

        // Create or activate JudgeAssignment for this round
        Optional<JudgeAssignment> existingAssignment = judgeAssignmentRepository
                .findByRoundIdAndJudgeId(round.getId(), judgeUser.getUserId());

        if (existingAssignment.isPresent()) {
            JudgeAssignment assignment = existingAssignment.get();
            assignment.setStatus(JudgeAssignmentStatus.ACTIVE);
            assignment.setAssignedAt(now);
            assignment.setRevokedAt(null);
            assignment.setUpdatedAt(now);
            judgeAssignmentRepository.save(assignment);
        } else {
            JudgeAssignment assignment = JudgeAssignment.builder()
                    .roundId(round.getId())
                    .judgeId(judgeUser.getUserId())
                    .assignedBy(invitation.getOrganizerId())
                    .status(JudgeAssignmentStatus.ACTIVE)
                    .assignedAt(now)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
            judgeAssignmentRepository.save(assignment);
        }

        // Update invitation
        invitation.setStatus(JudgeInvitationStatus.ACCEPTED);
        invitation.setAcceptedAt(now);
        invitation.setJudgeId(judgeUser.getUserId());
        invitation.setInvitationTokenHash(null); // clear token once used
        judgeInvitationRepository.save(invitation);

        Activity activity = invitation.getActivityId() != null
                ? activityRepository.findById(invitation.getActivityId()).orElse(null)
                : null;
        Event parentEvent = invitation.getEventId() != null
                ? eventRepository.findById(invitation.getEventId()).orElse(null)
                : null;

        return toResponse(invitation, round, activity, parentEvent, null);
    }

    /**
     * Lists all judge invitations for a round.
     */
    public List<JudgeInvitationResponse> getRoundInvitations(
            String roundId,
            String organizerId
    ) {
        JudgeRound round = getAndValidateOwnedRound(roundId, organizerId);
        Activity activity = activityRepository.findById(round.getActivityId()).orElse(null);
        Event parentEvent = (activity != null && activity.getEventId() != null)
                ? eventRepository.findById(activity.getEventId()).orElse(null)
                : null;

        return judgeInvitationRepository.findByRoundId(round.getId())
                .stream()
                .map(inv -> toResponse(inv, round, activity, parentEvent, null))
                .toList();
    }

    /**
     * Revokes a pending judge invitation.
     */
    public JudgeInvitationResponse revokeInvitation(
            String roundId,
            String invitationId,
            String organizerId
    ) {
        JudgeRound round = getAndValidateOwnedRound(roundId, organizerId);

        JudgeInvitation invitation = judgeInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Judge invitation not found."));

        if (!invitation.getRoundId().equals(round.getId())) {
            throw new BadRequestException("Invitation does not belong to this round.");
        }

        if (invitation.getStatus() == JudgeInvitationStatus.ACCEPTED) {
            throw new BadRequestException(
                    "This invitation has already been accepted. Revoke the judge assignment directly instead."
            );
        }

        invitation.setStatus(JudgeInvitationStatus.REVOKED);
        invitation.setRevokedAt(LocalDateTime.now());
        invitation.setInvitationTokenHash(null);

        JudgeInvitation saved = judgeInvitationRepository.save(invitation);

        Activity activity = activityRepository.findById(round.getActivityId()).orElse(null);
        Event parentEvent = (activity != null && activity.getEventId() != null)
                ? eventRepository.findById(activity.getEventId()).orElse(null)
                : null;

        return toResponse(saved, round, activity, parentEvent, null);
    }

    private JudgeInvitation findValidInvitation(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BadRequestException("Invitation token is required.");
        }

        JudgeInvitation invitation = judgeInvitationRepository
                .findByInvitationTokenHashAndStatus(
                        sha256(rawToken),
                        JudgeInvitationStatus.INVITED
                )
                .orElseThrow(() -> new BadRequestException(
                        "This judge invitation is invalid or has already been used."
                ));

        if (invitation.getInvitationExpiresAt() != null
                && !invitation.getInvitationExpiresAt().isAfter(LocalDateTime.now())) {
            invitation.setStatus(JudgeInvitationStatus.EXPIRED);
            judgeInvitationRepository.save(invitation);
            throw new BadRequestException("This judge invitation has expired.");
        }

        return invitation;
    }

    private JudgeRound getAndValidateOwnedRound(String roundId, String organizerId) {
        JudgeRound round = judgingRoundRepository.findById(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Judging round not found."));

        judgeRoundValidator.getAndValidateJudgingActivity(round.getActivityId(), organizerId);
        return round;
    }

    private JudgeInvitationResponse toResponse(
            JudgeInvitation inv,
            JudgeRound round,
            Activity activity,
            Event parentEvent,
            String rawToken
    ) {
        boolean accountExists = userRepository.findByEmail(inv.getEmail())
                .map(User::isActive)
                .orElse(false);

        String link = rawToken != null
                ? frontendBaseUrl.replaceAll("/+$", "") + "/judge/invitations/" + rawToken
                : null;

        return JudgeInvitationResponse.builder()
                .id(inv.getId())
                .roundId(inv.getRoundId())
                .roundName(round != null ? round.getName() : null)
                .sequence(round != null ? round.getSequence() : null)
                .activityId(inv.getActivityId())
                .activityName(activity != null ? activity.getName() : null)
                .eventId(inv.getEventId())
                .eventName(parentEvent != null ? parentEvent.getTitle() : null)
                .organizerId(inv.getOrganizerId())
                .judgeId(inv.getJudgeId())
                .email(inv.getEmail())
                .invitedName(inv.getInvitedName())
                .status(inv.getStatus())
                .invitedAt(inv.getInvitedAt())
                .invitationExpiresAt(inv.getInvitationExpiresAt())
                .acceptedAt(inv.getAcceptedAt())
                .accountExists(accountExists)
                .invitationLink(link)
                .build();
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }
}
