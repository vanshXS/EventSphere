package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.event.dto.TicketResponse;
import com.vansh.eventsphere.eventsphere.event.model.ActivityRegistration;
import com.vansh.eventsphere.eventsphere.event.model.EventRegistration;
import com.vansh.eventsphere.eventsphere.event.model.RegistrationStatus;
import com.vansh.eventsphere.eventsphere.event.model.Ticket;
import com.vansh.eventsphere.eventsphere.event.model.TicketScope;
import com.vansh.eventsphere.eventsphere.event.model.Team;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.TicketRepository;
import com.vansh.eventsphere.eventsphere.event.repository.TeamRepository;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TeamRepository teamRepository;
    private final EventRegistrationRepository eventRegistrationRepository;
    private final ActivityRegistrationRepository activityRegistrationRepository;

    @Value("${eventsphere.ticket.secret:${jwt.secret}}")
    private String ticketSecret;

    public TicketResponse issueForEventRegistration(
            EventRegistration registration,
            String participantId
    ) {
        if (!registration.getParticipantId().equals(participantId)) {
            throw new BadRequestException(
                    "You are not allowed to access this ticket."
            );
        }

        assertActive(registration.getStatus());

        Ticket ticket = ticketRepository
                .findByRegistrationIdAndHolderParticipantId(
                        registration.getId(),
                        participantId
                )
                .orElseGet(() -> Ticket.builder()
                        .registrationId(registration.getId())
                        .eventId(registration.getEventId())
                        .holderParticipantId(participantId)
                        .scope(TicketScope.EVENT)
                        .build());

        if (!ticket.isActive()) {
            rotate(ticket);
            return toResponse(ticketRepository.save(ticket));
        }

        return toResponse(ticket);
    }

    public TicketResponse issueForActivityRegistration(
            ActivityRegistration registration,
            String participantId
    ) {
        if (!isActivityParticipant(registration, participantId)) {
            throw new BadRequestException(
                    "You are not a participant in this registration."
            );
        }

        assertActive(registration.getStatus());

        Ticket ticket = ticketRepository
                .findByRegistrationIdAndHolderParticipantId(
                        registration.getId(),
                        participantId
                )
                .orElseGet(() -> Ticket.builder()
                        .registrationId(registration.getId())
                        .eventId(registration.getEventId())
                        .activityId(registration.getActivityId())
                        .holderParticipantId(participantId)
                        .scope(TicketScope.ACTIVITY)
                        .build());

        if (!ticket.isActive()) {
            rotate(ticket);
            return toResponse(ticketRepository.save(ticket));
        }

        return toResponse(ticket);
    }

    public TicketResponse getOrIssueEventTicket(
            String registrationId,
            String participantId
    ) {
        EventRegistration registration = eventRegistrationRepository.findById(
                registrationId
        ).orElseThrow(() ->
                new ResourceNotFoundException(
                        "Event registration not found."
                )
        );

        return issueForEventRegistration(registration, participantId);
    }

    public TicketResponse getOrIssueActivityTicket(
            String registrationId,
            String participantId
    ) {
        ActivityRegistration registration =
                activityRegistrationRepository.findById(registrationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Activity registration not found."
                                )
                        );

        return issueForActivityRegistration(registration, participantId);
    }

    public TicketResponse getActiveTicketForRegistration(
            String registrationId,
            String participantId
    ) {
        return ticketRepository
                .findByRegistrationIdAndHolderParticipantId(
                        registrationId,
                        participantId
                )
                .filter(Ticket::isActive)
                .map(this::toResponse)
                .orElse(null);
    }

    public Ticket verifyToken(String rawToken) {
        String[] parts = rawToken == null
                ? new String[0]
                : rawToken.split("\\.", -1);

        if (parts.length != 3) {
            throw new BadRequestException("Invalid QR ticket.");
        }

        Ticket ticket = ticketRepository.findById(parts[0])
                .orElseThrow(() ->
                        new BadRequestException("Invalid QR ticket.")
                );

        if (!ticket.isActive() || !parts[1].equals(ticket.getNonce())) {
            throw new BadRequestException(
                    "This QR ticket is no longer active."
            );
        }

        String expectedSignature = sign(parts[0] + "." + parts[1]);

        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                parts[2].getBytes(StandardCharsets.UTF_8)
        )) {
            throw new BadRequestException("Invalid QR ticket.");
        }

        return ticket;
    }

    public String extractTicketId(String rawToken) {
        String[] parts = rawToken == null
                ? new String[0]
                : rawToken.split("\\.", -1);

        if (parts.length != 3 || parts[0].isBlank()) {
            throw new BadRequestException("Invalid QR ticket.");
        }

        return parts[0];
    }

    public void revokeByRegistrationId(String registrationId) {
        List<Ticket> tickets = ticketRepository.findByRegistrationId(
                registrationId
        );

        LocalDateTime now = LocalDateTime.now();

        tickets.forEach(ticket -> {
            ticket.setActive(false);
            ticket.setRevokedAt(now);
        });

        if (!tickets.isEmpty()) {
            ticketRepository.saveAll(tickets);
        }
    }

    private boolean isActivityParticipant(
            ActivityRegistration registration,
            String participantId
    ) {
        if (participantId.equals(registration.getParticipantId())) {
            return true;
        }

        if (registration.getTeamMemberIds() != null
                && registration.getTeamMemberIds().contains(participantId)) {
            return true;
        }

        /*
         * The registration stores a member snapshot for audit/history, but
         * ticket access follows the current team membership as well. This
         * lets a newly-added team member receive their own ticket without
         * rewriting the original registration document.
         */
        if (registration.getTeamId() == null) {
            return false;
        }

        return teamRepository.findById(registration.getTeamId())
                .map(Team::getMembersId)
                .map(members -> members != null && members.contains(participantId))
                .orElse(false);
    }

    private void assertActive(RegistrationStatus status) {
        if (status != RegistrationStatus.APPROVED
                && status != RegistrationStatus.REGISTERED) {
            throw new BadRequestException(
                    "A ticket is not available for this registration."
            );
        }
    }

    private void rotate(Ticket ticket) {
        ticket.setNonce(UUID.randomUUID().toString());
        ticket.setActive(true);
        ticket.setRevokedAt(null);
        ticket.setIssuedAt(LocalDateTime.now());
    }

    private TicketResponse toResponse(Ticket ticket) {
        String payload = ticket.getId() + "."
                + ticket.getNonce() + "."
                + sign(ticket.getId() + "." + ticket.getNonce());

        return TicketResponse.builder()
                .ticketId(ticket.getId())
                .scope(ticket.getScope())
                .registrationId(ticket.getRegistrationId())
                .eventId(ticket.getEventId())
                .activityId(ticket.getActivityId())
                .participantId(ticket.getHolderParticipantId())
                .qrPayload(payload)
                .issuedAt(ticket.getIssuedAt())
                .build();
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                    ticketSecret.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            ));

            return Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(
                            mac.doFinal(
                                    value.getBytes(StandardCharsets.UTF_8)
                            )
                    );
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to sign ticket.",
                    exception
            );
        }
    }
}
