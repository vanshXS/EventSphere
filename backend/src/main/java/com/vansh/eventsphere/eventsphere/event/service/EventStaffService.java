package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.event.dto.AcceptStaffInvitationRequest;
import com.vansh.eventsphere.eventsphere.event.dto.EventStaffAssignmentResponse;
import com.vansh.eventsphere.eventsphere.event.dto.InviteStaffRequest;
import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.model.CheckInType;
import com.vansh.eventsphere.eventsphere.event.model.Event;
import com.vansh.eventsphere.eventsphere.event.model.EventStaffAssignment;
import com.vansh.eventsphere.eventsphere.event.model.EventStaffPermission;
import com.vansh.eventsphere.eventsphere.event.model.EventStaffStatus;
import com.vansh.eventsphere.eventsphere.event.model.TicketScope;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventStaffAssignmentRepository;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventStaffService {

    private static final int INVITATION_VALIDITY_DAYS = 7;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final List<EventStaffStatus> OPEN_STATUSES = List.of(
            EventStaffStatus.INVITED,
            EventStaffStatus.ACTIVE
    );

    private final EventStaffAssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final ActivityRepository activityRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TransactionRunner transactionRunner;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    public EventStaffAssignmentResponse inviteToEvent(
            String eventId,
            InviteStaffRequest request,
            String organizerId
    ) {
        return transactionRunner.run(() -> {
            transactionRunner.guard(Event.class, eventId);

            Event event = getEvent(eventId);
            assertEventOwner(event, organizerId);

            String email = normalizeEmail(request.getEmail());

            if (assignmentRepository.existsByEventIdAndEmailAndPermissionAndStatusIn(
                    eventId,
                    email,
                    EventStaffPermission.CHECK_IN,
                    OPEN_STATUSES
            )) {
                throw new BadRequestException(
                        "This volunteer is already invited or assigned to this event."
                );
            }

            return createInvitation(
                    organizerId,
                    eventId,
                    null,
                    event.getTitle(),
                    null,
                    email,
                    request.getName()
            );
        });
    }

    public EventStaffAssignmentResponse inviteToActivity(
            String activityId,
            InviteStaffRequest request,
            String organizerId
    ) {
        return transactionRunner.run(() -> {
            transactionRunner.guard(Activity.class, activityId);

            Activity activity = getActivity(activityId);

            Event parentEvent = activity.getEventId() != null
                    ? getEvent(activity.getEventId())
                    : null;

            String ownerId = parentEvent != null
                    ? parentEvent.getOrganizerId()
                    : activity.getOrganizerId();

            if (!organizerId.equals(ownerId)) {
                throw new BadRequestException(
                        "You are not allowed to manage staff for this activity."
                );
            }

            String email = normalizeEmail(request.getEmail());

            if (assignmentRepository.existsByActivityIdAndEmailAndPermissionAndStatusIn(
                    activityId,
                    email,
                    EventStaffPermission.CHECK_IN,
                    OPEN_STATUSES
            )) {
                throw new BadRequestException(
                        "This volunteer is already invited or assigned to this activity."
                );
            }

            return createInvitation(
                    organizerId,
                    parentEvent != null ? parentEvent.getId() : null,
                    activityId,
                    parentEvent != null ? parentEvent.getTitle() : null,
                    activity.getName(),
                    email,
                    request.getName()
            );
        });
    }

    public List<EventStaffAssignmentResponse> getEventStaff(
            String eventId,
            String organizerId
    ) {
        Event event = getEvent(eventId);
        assertEventOwner(event, organizerId);

        return assignmentRepository.findByEventId(eventId)
                .stream()
                .map(this::toResponseWithoutLink)
                .toList();
    }

    public List<EventStaffAssignmentResponse> getActivityStaff(
            String activityId,
            String organizerId
    ) {
        Activity activity = getActivity(activityId);
        String ownerId = activity.getEventId() != null
                ? getEvent(activity.getEventId()).getOrganizerId()
                : activity.getOrganizerId();

        if (!organizerId.equals(ownerId)) {
            throw new BadRequestException(
                    "You are not allowed to view staff for this activity."
            );
        }

        return assignmentRepository.findByActivityId(activityId)
                .stream()
                .map(this::toResponseWithoutLink)
                .toList();
    }

    public List<EventStaffAssignmentResponse> getMyAssignments(String userId) {
        return assignmentRepository.findByUserIdAndStatus(
                        userId,
                        EventStaffStatus.ACTIVE
                )
                .stream()
                .map(this::toResponseWithoutLink)
                .toList();
    }

    public EventStaffAssignmentResponse getInvitation(String rawToken) {
        EventStaffAssignment assignment = findInvitation(rawToken);

        if (!assignment.getInvitationExpiresAt().isAfter(LocalDateTime.now())) {
            assignment.setStatus(EventStaffStatus.EXPIRED);
            assignmentRepository.save(assignment);
            throw new BadRequestException("This invitation has expired.");
        }

        return toResponseWithLink(assignment, rawToken);
    }

    public EventStaffAssignmentResponse acceptInvitation(
            String rawToken,
            AcceptStaffInvitationRequest request
    ) {
        return transactionRunner.run(() -> {
            EventStaffAssignment assignment = findInvitation(rawToken);

            transactionRunner.guard(
                    EventStaffAssignment.class,
                    assignment.getId()
            );

            if (!assignment.getInvitationExpiresAt().isAfter(LocalDateTime.now())) {
                assignment.setStatus(EventStaffStatus.EXPIRED);
                assignmentRepository.save(assignment);
                throw new BadRequestException("This invitation has expired.");
            }

            String email = assignment.getEmail();
            User user = userRepository.findByEmail(email).orElse(null);

            if (user == null) {
                String name = firstNonBlank(
                        request == null ? null : request.getName(),
                        assignment.getInvitedName()
                );

                String password = request == null ? null : request.getPassword();

                if (name == null) {
                    throw new BadRequestException(
                            "Name is required to create the volunteer account."
                    );
                }

                if (password == null
                        || password.isBlank()
                        || password.length() < 8) {
                    throw new BadRequestException(
                            "A password with at least 8 characters is required to create the account."
                    );
                }

                LocalDateTime now = LocalDateTime.now();

                user = User.builder()
                        .name(name)
                        .email(email)
                        .password(passwordEncoder.encode(password))
                        .role(Role.VOLUNTEER)
                        .collegeId(null)
                        .active(true)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();

                userRepository.save(user);
            } else if (!user.isActive()) {
                throw new BadRequestException("The invited account is inactive.");
            }

            assignment.setUserId(user.getUserId());
            assignment.setStatus(EventStaffStatus.ACTIVE);
            assignment.setAcceptedAt(LocalDateTime.now());
            assignment.setInvitationTokenHash(null);

            return toResponseWithoutLink(
                    assignmentRepository.save(assignment)
            );
        });
    }

    public void revoke(String assignmentId, String organizerId) {
        EventStaffAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Staff assignment not found."
                ));

        assertOrganizerOwnsAssignment(assignment, organizerId);

        if (assignment.getStatus() == EventStaffStatus.REVOKED) {
            return;
        }

        assignment.setStatus(EventStaffStatus.REVOKED);
        assignment.setRevokedAt(LocalDateTime.now());
        assignment.setInvitationTokenHash(null);
        assignmentRepository.save(assignment);
    }

    public boolean hasCheckInAccess(
            String userId,
            String eventId,
            String activityId,
            TicketScope scope
    ) {
        return assignmentRepository.findByUserIdAndStatus(
                        userId,
                        EventStaffStatus.ACTIVE
                )
                .stream()
                .anyMatch(assignment -> {
                    if (assignment.getPermission() != EventStaffPermission.CHECK_IN) {
                        return false;
                    }

                    if (scope == TicketScope.EVENT) {
                        return eventId != null
                                && eventId.equals(assignment.getEventId())
                                && assignment.getActivityId() == null;
                    }

                    if (activityId != null
                            && activityId.equals(assignment.getActivityId())) {
                        return true;
                    }

                    return eventId != null
                            && eventId.equals(assignment.getEventId())
                            && assignment.getActivityId() == null;
                });
    }

    private EventStaffAssignmentResponse createInvitation(
            String organizerId,
            String eventId,
            String activityId,
            String eventName,
            String activityName,
            String email,
            String invitedName
    ) {
        String rawToken = generateToken();
        LocalDateTime now = LocalDateTime.now();

        EventStaffAssignment saved = assignmentRepository.save(
                EventStaffAssignment.builder()
                        .eventId(eventId)
                        .activityId(activityId)
                        .organizerId(organizerId)
                        .email(email)
                        .invitedName(blankToNull(invitedName))
                        .permission(EventStaffPermission.CHECK_IN)
                        .status(EventStaffStatus.INVITED)
                        .invitationTokenHash(sha256(rawToken))
                        .invitationExpiresAt(
                                now.plusDays(INVITATION_VALIDITY_DAYS)
                        )
                        .invitedAt(now)
                        .build()
        );

        return EventStaffAssignmentResponse.builder()
                .id(saved.getId())
                .eventId(saved.getEventId())
                .eventName(eventName)
                .activityId(saved.getActivityId())
                .activityName(activityName)
                .organizerId(saved.getOrganizerId())
                .userId(saved.getUserId())
                .email(saved.getEmail())
                .invitedName(saved.getInvitedName())
                .permission(saved.getPermission())
                .status(saved.getStatus())
                .invitedAt(saved.getInvitedAt())
                .invitationExpiresAt(saved.getInvitationExpiresAt())
                .acceptedAt(saved.getAcceptedAt())
                .invitationLink(buildInvitationLink(rawToken))
                .build();
    }

    private EventStaffAssignment findInvitation(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BadRequestException("Invitation token is required.");
        }

        return assignmentRepository.findByInvitationTokenHashAndStatus(
                        sha256(rawToken),
                        EventStaffStatus.INVITED
                )
                .orElseThrow(() -> new BadRequestException(
                        "This invitation is invalid or has already been used."
                ));
    }

    private void assertOrganizerOwnsAssignment(
            EventStaffAssignment assignment,
            String organizerId
    ) {
        if (assignment.getEventId() != null) {
            assertEventOwner(getEvent(assignment.getEventId()), organizerId);
            return;
        }

        Activity activity = getActivity(assignment.getActivityId());

        String ownerId = activity.getEventId() != null
                ? getEvent(activity.getEventId()).getOrganizerId()
                : activity.getOrganizerId();

        if (!organizerId.equals(ownerId)) {
            throw new BadRequestException(
                    "You are not allowed to manage this staff assignment."
            );
        }
    }

    private Event getEvent(String eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found."));
    }

    private Activity getActivity(String activityId) {
        return activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found."));
    }

    private void assertEventOwner(Event event, String organizerId) {
        if (!organizerId.equals(event.getOrganizerId())) {
            throw new BadRequestException(
                    "You are not allowed to manage staff for this event."
            );
        }
    }

    private EventStaffAssignmentResponse toResponseWithoutLink(
            EventStaffAssignment assignment
    ) {
        String eventName = assignment.getEventId() == null
                ? null
                : eventRepository.findById(assignment.getEventId())
                        .map(Event::getTitle)
                        .orElse(null);

        String activityName = assignment.getActivityId() == null
                ? null
                : activityRepository.findById(assignment.getActivityId())
                        .map(Activity::getName)
                        .orElse(null);

        return EventStaffAssignmentResponse.builder()
                .id(assignment.getId())
                .eventId(assignment.getEventId())
                .eventName(eventName)
                .activityId(assignment.getActivityId())
                .activityName(activityName)
                .organizerId(assignment.getOrganizerId())
                .userId(assignment.getUserId())
                .email(assignment.getEmail())
                .invitedName(assignment.getInvitedName())
                .permission(assignment.getPermission())
                .status(assignment.getStatus())
                .invitedAt(assignment.getInvitedAt())
                .invitationExpiresAt(assignment.getInvitationExpiresAt())
                .acceptedAt(assignment.getAcceptedAt())
                .build();
    }

    private EventStaffAssignmentResponse toResponseWithLink(
            EventStaffAssignment assignment,
            String rawToken
    ) {
        EventStaffAssignmentResponse response = toResponseWithoutLink(assignment);
        response.setInvitationLink(buildInvitationLink(rawToken));
        return response;
    }

    private String buildInvitationLink(String rawToken) {
        return frontendUrl.replaceAll("/$", "")
                + "/volunteer/invitations/"
                + rawToken;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(
                            digest.digest(raw.getBytes(StandardCharsets.UTF_8))
                    );
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to hash invitation token.",
                    exception
            );
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first.trim();
        }
        if (second != null && !second.isBlank()) {
            return second.trim();
        }
        return null;
    }
}
