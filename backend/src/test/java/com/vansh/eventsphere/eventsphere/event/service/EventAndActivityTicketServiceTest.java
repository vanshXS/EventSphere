package com.vansh.eventsphere.eventsphere.event.service;

import com.vansh.eventsphere.eventsphere.event.dto.TicketResponse;
import com.vansh.eventsphere.eventsphere.event.model.*;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRegistrationRepository;
import com.vansh.eventsphere.eventsphere.event.repository.TeamRepository;
import com.vansh.eventsphere.eventsphere.event.repository.TicketRepository;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventAndActivityTicketServiceTest {

    @Mock
    private TicketRepository ticketRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private EventRegistrationRepository eventRegistrationRepository;
    @Mock
    private ActivityRegistrationRepository activityRegistrationRepository;

    @InjectMocks
    private TicketService ticketService;

    private final String eventId = "evt-techfest-2026";
    private final String participant1 = "part-vansh";
    private final String participant2 = "part-alice";
    private final String participant3 = "part-bob";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(ticketService, "ticketSecret", "my-test-secret-key-1234567890123456");
    }

    @Test
    @DisplayName("Single Event Entry ticket is created and reused across multiple activity registrations")
    void testEnsureEventEntryTicket_ReusesExistingTicket() {
        Ticket existingTicket = Ticket.builder()
                .id("tkt-event-1")
                .eventId(eventId)
                .holderParticipantId(participant1)
                .scope(TicketScope.EVENT)
                .registrationId("reg-event-1")
                .active(true)
                .nonce("nonce-123")
                .issuedAt(LocalDateTime.now())
                .build();

        when(ticketRepository.findByEventIdAndHolderParticipantIdAndScope(
                eventId,
                participant1,
                TicketScope.EVENT
        )).thenReturn(Optional.of(existingTicket));

        // When ensuring event entry ticket for Hackathon
        TicketResponse res1 = ticketService.ensureEventEntryTicket(eventId, participant1, "reg-event-1");

        // When ensuring event entry ticket for Quiz
        TicketResponse res2 = ticketService.ensureEventEntryTicket(eventId, participant1, "reg-event-1");

        assertEquals(res1.getTicketId(), res2.getTicketId());
        assertEquals(TicketScope.EVENT, res1.getScope());
        // verify save was NOT called because ticket is already active
        verify(ticketRepository, never()).save(any());
    }

    @Test
    @DisplayName("Activity registration ensures both Activity ticket and parent Event Entry ticket")
    void testEnsureTicketsForActivityRegistration_IssuesBothActivityAndEventTicket() {
        ActivityRegistration hackathonReg = ActivityRegistration.builder()
                .id("reg-hackathon")
                .eventId(eventId)
                .activityId("act-hackathon")
                .participantId(participant1)
                .registrationType(RegistrationType.INDIVIDUAL)
                .status(RegistrationStatus.APPROVED)
                .build();

        when(eventRegistrationRepository.findByEventIdAndParticipantId(eventId, participant1))
                .thenReturn(Optional.empty());

        EventRegistration savedEventReg = EventRegistration.builder()
                .id("reg-event-auto-1")
                .eventId(eventId)
                .participantId(participant1)
                .status(RegistrationStatus.APPROVED)
                .autoGranted(true)
                .build();

        when(eventRegistrationRepository.save(any(EventRegistration.class)))
                .thenReturn(savedEventReg);

        when(ticketRepository.findByEventIdAndHolderParticipantIdAndScope(eventId, participant1, TicketScope.EVENT))
                .thenReturn(Optional.empty());

        when(ticketRepository.findByRegistrationIdAndHolderParticipantId("reg-hackathon", participant1))
                .thenReturn(Optional.empty());

        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> {
            Ticket t = inv.getArgument(0);
            if (t.getId() == null) {
                t.setId("tkt-generated-" + System.nanoTime());
            }
            return t;
        });

        ticketService.ensureTicketsForActivityRegistration(hackathonReg);

        // Saved 1 Event Entry ticket + 1 Activity ticket = 2 tickets saved
        verify(ticketRepository, times(2)).save(any(Ticket.class));
    }

    @Test
    @DisplayName("Team registration issues individual Event Entry ticket and Activity ticket for each member")
    void testEnsureTicketsForActivityRegistration_ForTeams_IssuesIndividualTickets() {
        List<String> memberIds = List.of(participant1, participant2, participant3);

        ActivityRegistration teamReg = ActivityRegistration.builder()
                .id("reg-team-hackathon")
                .eventId(eventId)
                .activityId("act-hackathon")
                .participantId(participant1)
                .registrationType(RegistrationType.TEAM)
                .teamId("team-alpha")
                .teamMemberIds(memberIds)
                .status(RegistrationStatus.APPROVED)
                .build();

        for (String p : memberIds) {
            when(eventRegistrationRepository.findByEventIdAndParticipantId(eventId, p))
                    .thenReturn(Optional.of(EventRegistration.builder()
                            .id("reg-event-" + p)
                            .eventId(eventId)
                            .participantId(p)
                            .status(RegistrationStatus.APPROVED)
                            .build()));

            when(ticketRepository.findByEventIdAndHolderParticipantIdAndScope(eventId, p, TicketScope.EVENT))
                    .thenReturn(Optional.of(Ticket.builder()
                            .id("tkt-event-" + p)
                            .eventId(eventId)
                            .holderParticipantId(p)
                            .scope(TicketScope.EVENT)
                            .active(true)
                            .nonce("nonce-" + p)
                            .build()));

            when(ticketRepository.findByRegistrationIdAndHolderParticipantId("reg-team-hackathon", p))
                    .thenReturn(Optional.of(Ticket.builder()
                            .id("tkt-act-" + p)
                            .eventId(eventId)
                            .activityId("act-hackathon")
                            .holderParticipantId(p)
                            .scope(TicketScope.ACTIVITY)
                            .active(true)
                            .nonce("nonce-act-" + p)
                            .build()));
        }

        ticketService.ensureTicketsForActivityRegistration(teamReg);

        // Verified all 3 participants processed
        for (String p : memberIds) {
            verify(ticketRepository).findByEventIdAndHolderParticipantIdAndScope(eventId, p, TicketScope.EVENT);
            verify(ticketRepository).findByRegistrationIdAndHolderParticipantId("reg-team-hackathon", p);
        }
    }

    @Test
    @DisplayName("Cancelling one activity does NOT revoke Event Entry ticket if participant has other active activities")
    void testRevokeActivityRegistration_DoesNotRevokeEventTicket_WhenOtherActivityExists() {
        ActivityRegistration hackathonReg = ActivityRegistration.builder()
                .id("reg-hackathon")
                .eventId(eventId)
                .activityId("act-hackathon")
                .participantId(participant1)
                .build();

        Ticket hackathonTicket = Ticket.builder()
                .id("tkt-hackathon")
                .registrationId("reg-hackathon")
                .scope(TicketScope.ACTIVITY)
                .active(true)
                .build();

        when(ticketRepository.findByRegistrationId("reg-hackathon"))
                .thenReturn(List.of(hackathonTicket));

        // Participant also has Quiz registration in the same event
        ActivityRegistration quizReg = ActivityRegistration.builder()
                .id("reg-quiz")
                .eventId(eventId)
                .activityId("act-quiz")
                .participantId(participant1)
                .status(RegistrationStatus.APPROVED)
                .build();

        when(eventRegistrationRepository.findByEventIdAndParticipantId(eventId, participant1))
                .thenReturn(Optional.empty());

        when(activityRegistrationRepository.findByParticipantIdOrTeamMemberIdsContaining(participant1, participant1))
                .thenReturn(List.of(hackathonReg, quizReg));

        lenient().when(teamRepository.findByMembersIdContaining(participant1))
                .thenReturn(List.of());

        // Cancel hackathon
        ticketService.revokeActivityRegistration(hackathonReg);

        // Activity ticket is revoked
        assertFalse(hackathonTicket.isActive());
        assertNotNull(hackathonTicket.getRevokedAt());

        // Event entry ticket was NOT looked up to be revoked because hasRemainingActiveRegistrationsInEvent returned true
        verify(ticketRepository, never()).findByEventIdAndHolderParticipantIdAndScope(eventId, participant1, TicketScope.EVENT);
    }

    @Test
    @DisplayName("Cancelling the last activity in an event DOES revoke the Event Entry ticket")
    void testRevokeActivityRegistration_RevokesEventTicket_WhenNoOtherActivityExists() {
        ActivityRegistration hackathonReg = ActivityRegistration.builder()
                .id("reg-hackathon")
                .eventId(eventId)
                .activityId("act-hackathon")
                .participantId(participant1)
                .build();

        Ticket hackathonTicket = Ticket.builder()
                .id("tkt-hackathon")
                .registrationId("reg-hackathon")
                .scope(TicketScope.ACTIVITY)
                .active(true)
                .build();

        Ticket eventTicket = Ticket.builder()
                .id("tkt-event")
                .eventId(eventId)
                .holderParticipantId(participant1)
                .scope(TicketScope.EVENT)
                .active(true)
                .build();

        EventRegistration autoEventReg = EventRegistration.builder()
                .id("reg-event-auto")
                .eventId(eventId)
                .participantId(participant1)
                .autoGranted(true)
                .status(RegistrationStatus.APPROVED)
                .build();

        when(ticketRepository.findByRegistrationId("reg-hackathon"))
                .thenReturn(List.of(hackathonTicket));

        when(eventRegistrationRepository.findByEventIdAndParticipantId(eventId, participant1))
                .thenReturn(Optional.of(autoEventReg));

        // No other active activities in this event
        when(activityRegistrationRepository.findByParticipantIdOrTeamMemberIdsContaining(participant1, participant1))
                .thenReturn(List.of(hackathonReg));

        when(teamRepository.findByMembersIdContaining(participant1))
                .thenReturn(List.of());

        when(ticketRepository.findByEventIdAndHolderParticipantIdAndScope(eventId, participant1, TicketScope.EVENT))
                .thenReturn(Optional.of(eventTicket));

        // Cancel hackathon (only activity)
        ticketService.revokeActivityRegistration(hackathonReg);

        // Both tickets are now revoked!
        assertFalse(hackathonTicket.isActive());
        assertFalse(eventTicket.isActive());
        assertNotNull(eventTicket.getRevokedAt());

        // Auto-granted event registration marked CANCELLED
        assertEquals(RegistrationStatus.CANCELLED, autoEventReg.getStatus());
        assertNotNull(autoEventReg.getCancelledAt());
    }
}
