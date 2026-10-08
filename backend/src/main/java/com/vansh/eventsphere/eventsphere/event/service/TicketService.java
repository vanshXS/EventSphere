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
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
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
                .or(() -> ticketRepository.findByEventIdAndHolderParticipantIdAndScope(
                        registration.getEventId(),
                        participantId,
                        TicketScope.EVENT
                ))
                .orElseGet(() -> Ticket.builder()
                        .registrationId(registration.getId())
                        .eventId(registration.getEventId())
                        .holderParticipantId(participantId)
                        .scope(TicketScope.EVENT)
                        .build());

        if (registration.getId() != null && !registration.getId().equals(ticket.getRegistrationId())) {
            ticket.setRegistrationId(registration.getId());
        }

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

        if ((registration.getStatus() == RegistrationStatus.APPROVED
                || registration.getStatus() == RegistrationStatus.REGISTERED)
                && registration.getEventId() != null
                && !registration.getEventId().isBlank()) {
            EventRegistration eventReg = getOrEnsureEventRegistration(
                    registration.getEventId(),
                    participantId
            );
            ensureEventEntryTicket(
                    registration.getEventId(),
                    participantId,
                    eventReg.getId()
            );
        }

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

    public TicketResponse ensureEventEntryTicket(
            String eventId,
            String participantId,
            String registrationId
    ) {
        Ticket ticket = ticketRepository
                .findByEventIdAndHolderParticipantIdAndScope(
                        eventId,
                        participantId,
                        TicketScope.EVENT
                )
                .orElseGet(() -> Ticket.builder()
                        .registrationId(registrationId)
                        .eventId(eventId)
                        .holderParticipantId(participantId)
                        .scope(TicketScope.EVENT)
                        .build());

        if (registrationId != null && !registrationId.equals(ticket.getRegistrationId())) {
            ticket.setRegistrationId(registrationId);
        }

        if (!ticket.isActive()) {
            rotate(ticket);
            return toResponse(ticketRepository.save(ticket));
        }

        return toResponse(ticket);
    }

    public EventRegistration getOrEnsureEventRegistration(String eventId, String participantId) {
        return eventRegistrationRepository
                .findByEventIdAndParticipantId(eventId, participantId)
                .map(existing -> {
                    if (existing.getStatus() == RegistrationStatus.CANCELLED) {
                        existing.setStatus(RegistrationStatus.APPROVED);
                        existing.setCancelledAt(null);
                        return eventRegistrationRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> eventRegistrationRepository.save(
                        EventRegistration.builder()
                                .eventId(eventId)
                                .participantId(participantId)
                                .status(RegistrationStatus.APPROVED)
                                .autoGranted(true)
                                .registeredAt(LocalDateTime.now())
                                .build()
                ));
    }

    public List<String> getParticipantIdsForRegistration(ActivityRegistration registration) {
        Set<String> participantIds = new LinkedHashSet<>();
        if (registration.getParticipantId() != null && !registration.getParticipantId().isBlank()) {
            participantIds.add(registration.getParticipantId());
        }
        if (registration.getTeamMemberIds() != null) {
            for (String memberId : registration.getTeamMemberIds()) {
                if (memberId != null && !memberId.isBlank()) {
                    participantIds.add(memberId);
                }
            }
        }
        if (registration.getTeamId() != null && !registration.getTeamId().isBlank()) {
            teamRepository.findById(registration.getTeamId())
                    .map(Team::getMembersId)
                    .ifPresent(members -> {
                        if (members != null) {
                            for (String m : members) {
                                if (m != null && !m.isBlank()) {
                                    participantIds.add(m);
                                }
                            }
                        }
                    });
        }
        return new ArrayList<>(participantIds);
    }

    public void ensureTicketsForActivityRegistration(ActivityRegistration registration) {
        if (registration.getStatus() != RegistrationStatus.APPROVED
                && registration.getStatus() != RegistrationStatus.REGISTERED) {
            return;
        }

        List<String> participantIds = getParticipantIdsForRegistration(registration);

        for (String participantId : participantIds) {
            issueForActivityRegistration(registration, participantId);

            if (registration.getEventId() != null && !registration.getEventId().isBlank()) {
                EventRegistration eventReg = getOrEnsureEventRegistration(
                        registration.getEventId(),
                        participantId
                );
                ensureEventEntryTicket(
                        registration.getEventId(),
                        participantId,
                        eventReg.getId()
                );
            }
        }
    }

    public boolean hasRemainingActiveRegistrationsInEvent(
            String eventId,
            String participantId,
            String excludedActivityRegistrationId
    ) {
        boolean hasDirectEventReg = eventRegistrationRepository
                .findByEventIdAndParticipantId(eventId, participantId)
                .filter(reg -> !reg.isAutoGranted()
                        && (reg.getStatus() == RegistrationStatus.APPROVED
                        || reg.getStatus() == RegistrationStatus.REGISTERED))
                .isPresent();

        if (hasDirectEventReg) {
            return true;
        }

        List<RegistrationStatus> activeStatuses = List.of(
                RegistrationStatus.APPROVED,
                RegistrationStatus.REGISTERED,
                RegistrationStatus.PENDING
        );

        List<ActivityRegistration> userRegistrations = activityRegistrationRepository
                .findByParticipantIdOrTeamMemberIdsContaining(participantId, participantId);

        boolean hasOtherActivity = userRegistrations.stream()
                .filter(reg -> eventId.equals(reg.getEventId()))
                .filter(reg -> excludedActivityRegistrationId == null || !excludedActivityRegistrationId.equals(reg.getId()))
                .anyMatch(reg -> activeStatuses.contains(reg.getStatus()));

        if (hasOtherActivity) {
            return true;
        }

        List<String> teamIds = teamRepository.findByMembersIdContaining(participantId)
                .stream()
                .map(Team::getId)
                .filter(id -> id != null && !id.isBlank())
                .toList();

        if (!teamIds.isEmpty()) {
            return activityRegistrationRepository.findByTeamIdIn(teamIds).stream()
                    .filter(reg -> eventId.equals(reg.getEventId()))
                    .filter(reg -> excludedActivityRegistrationId == null || !excludedActivityRegistrationId.equals(reg.getId()))
                    .anyMatch(reg -> activeStatuses.contains(reg.getStatus()));
        }

        return false;
    }

    public void revokeActivityRegistration(ActivityRegistration registration) {
        List<Ticket> tickets = ticketRepository.findByRegistrationId(registration.getId());
        LocalDateTime now = LocalDateTime.now();

        tickets.forEach(ticket -> {
            if (ticket.getScope() == TicketScope.ACTIVITY) {
                ticket.setActive(false);
                ticket.setRevokedAt(now);
            }
        });

        if (!tickets.isEmpty()) {
            ticketRepository.saveAll(tickets);
        }

        String eventId = registration.getEventId();
        if (eventId != null && !eventId.isBlank()) {
            List<String> participants = getParticipantIdsForRegistration(registration);
            for (String pId : participants) {
                boolean hasOther = hasRemainingActiveRegistrationsInEvent(eventId, pId, registration.getId());
                if (!hasOther) {
                    ticketRepository.findByEventIdAndHolderParticipantIdAndScope(
                            eventId,
                            pId,
                            TicketScope.EVENT
                    ).ifPresent(eventTicket -> {
                        eventTicket.setActive(false);
                        eventTicket.setRevokedAt(now);
                        ticketRepository.save(eventTicket);
                    });

                    eventRegistrationRepository.findByEventIdAndParticipantId(eventId, pId)
                            .ifPresent(eventReg -> {
                                if (eventReg.isAutoGranted()) {
                                    eventReg.setStatus(RegistrationStatus.CANCELLED);
                                    eventReg.setCancelledAt(now);
                                    eventRegistrationRepository.save(eventReg);
                                }
                            });
                }
            }
        }
    }

    public void revokeEventRegistration(EventRegistration registration) {
        String eventId = registration.getEventId();
        String participantId = registration.getParticipantId();

        boolean hasOther = hasRemainingActiveRegistrationsInEvent(eventId, participantId, null);
        if (!hasOther) {
            revokeByRegistrationId(registration.getId());
            ticketRepository.findByEventIdAndHolderParticipantIdAndScope(
                    eventId,
                    participantId,
                    TicketScope.EVENT
            ).ifPresent(ticket -> {
                ticket.setActive(false);
                ticket.setRevokedAt(LocalDateTime.now());
                ticketRepository.save(ticket);
            });
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

        /**
         * The registration stores a member snapshot for audit/history, but
         * ticket access follows the current team membership as well. This
         * lets a newly-added team member receive their own ticket without
         * rewriting the original registration document.
         **/
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

    public TicketResponse toResponse(Ticket ticket) {
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
