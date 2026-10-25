package com.vansh.eventsphere.eventsphere.judge.service;

import com.vansh.eventsphere.eventsphere.event.model.Activity;
import com.vansh.eventsphere.eventsphere.event.repository.ActivityRepository;
import com.vansh.eventsphere.eventsphere.event.repository.EventRepository;
import com.vansh.eventsphere.eventsphere.common.transaction.TransactionRunner;
import com.vansh.eventsphere.eventsphere.exception.BadRequestException;
import com.vansh.eventsphere.eventsphere.judge.dto.AcceptJudgeInvitationRequest;
import com.vansh.eventsphere.eventsphere.judge.dto.InviteJudgeRequest;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeInvitationResponse;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeAssignment;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeInvitation;
import com.vansh.eventsphere.eventsphere.judge.model.JudgeRound;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgeInvitationStatus;
import com.vansh.eventsphere.eventsphere.judge.model.enums.JudgingRoundStatus;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeAssignmentRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgeInvitationRepository;
import com.vansh.eventsphere.eventsphere.judge.repository.JudgingRoundRepository;
import com.vansh.eventsphere.eventsphere.judge.service.validator.JudgeRoundValidator;
import com.vansh.eventsphere.eventsphere.user.model.Role;
import com.vansh.eventsphere.eventsphere.user.model.User;
import com.vansh.eventsphere.eventsphere.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JudgeInvitationServiceTest {

    @Mock private JudgeInvitationRepository invitations;
    @Mock private JudgingRoundRepository rounds;
    @Mock private JudgeAssignmentRepository assignments;
    @Mock private ActivityRepository activities;
    @Mock private EventRepository events;
    @Mock private UserRepository users;
    @Mock private JudgeRoundValidator validator;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private TransactionRunner transactionRunner;

    private JudgeInvitationService service;
    private JudgeRound draftRound;
    private Activity activity;

    @BeforeEach
    void setUp() {
        service = new JudgeInvitationService(
                invitations, rounds, assignments, activities, events, users,
                validator, passwordEncoder, transactionRunner);
        draftRound = JudgeRound.builder()
                .id("round-1")
                .activityId("activity-1")
                .status(JudgingRoundStatus.DRAFT)
                .build();
        activity = Activity.builder().id("activity-1").name("Competition").build();
    }

    @Test
    void rejectsDuplicatePendingInvitationsForTheSameRoundAndEmail() {
        when(rounds.findById("round-1")).thenReturn(Optional.of(draftRound));
        when(validator.getAndValidateJudgingActivity("activity-1", "organizer-1"))
                .thenReturn(activity);
        when(invitations.findByRoundIdAndEmailAndStatusIn(
                eq("round-1"), eq("judge@example.com"), any()))
                .thenReturn(java.util.List.of(JudgeInvitation.builder()
                        .id("prior")
                        .roundId("round-1")
                        .email("judge@example.com")
                        .status(JudgeInvitationStatus.INVITED)
                        .invitationExpiresAt(java.time.LocalDateTime.now().plusDays(1))
                        .build()));

        assertThrows(BadRequestException.class, () -> service.inviteJudge(
                "round-1",
                InviteJudgeRequest.builder().email(" Judge@Example.com ").build(),
                "organizer-1"));
        verify(invitations, never()).save(any(JudgeInvitation.class));
    }

    @Test
    void existingJudgeInvitationCannotBeAcceptedByAnotherAuthenticatedAccount() throws Exception {
        mockTransactionRunner();
        String token = "one-time-token";
        JudgeInvitation invitation = invitedRecord(token);
        User judge = User.builder()
                .userId("invited-judge")
                .email("judge@example.com")
                .role(Role.JUDGE)
                .active(true)
                .build();
        when(invitations.findByInvitationTokenHashAndStatus(
                sha256(token), JudgeInvitationStatus.INVITED))
                .thenReturn(Optional.of(invitation));
        when(rounds.findById("round-1")).thenReturn(Optional.of(draftRound));
        when(users.findByEmail("judge@example.com")).thenReturn(Optional.of(judge));

        assertThrows(BadRequestException.class, () -> service.acceptInvitation(
                token, new AcceptJudgeInvitationRequest(), "different-user"));
        verify(assignments, never()).save(any(JudgeAssignment.class));
        verify(invitations, never()).save(any(JudgeInvitation.class));
    }

    @Test
    void invitationTokenCreatesOnlyTheInvitedJudgeAccountAndAssignment() throws Exception {
        mockTransactionRunner();
        String token = "one-time-token";
        JudgeInvitation invitation = invitedRecord(token);
        when(invitations.findByInvitationTokenHashAndStatus(
                sha256(token), JudgeInvitationStatus.INVITED))
                .thenReturn(Optional.of(invitation));
        when(rounds.findById("round-1")).thenReturn(Optional.of(draftRound));
        when(users.findByEmail("judge@example.com")).thenReturn(Optional.empty(), Optional.of(
                User.builder().userId("judge-1").email("judge@example.com")
                        .role(Role.JUDGE).active(true).build()));
        when(passwordEncoder.encode("safe-password")).thenReturn("hashed-password");
        when(users.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setUserId("judge-1");
            return saved;
        });
        when(assignments.findByRoundIdAndJudgeId("round-1", "judge-1"))
                .thenReturn(Optional.empty());
        when(assignments.save(any(JudgeAssignment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(invitations.save(any(JudgeInvitation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.acceptInvitation(
                token,
                AcceptJudgeInvitationRequest.builder()
                        .name("New Judge")
                        .password("safe-password")
                        .build(),
                null);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(users).save(userCaptor.capture());
        assertEquals("judge@example.com", userCaptor.getValue().getEmail());
        assertEquals(Role.JUDGE, userCaptor.getValue().getRole());
        assertEquals("hashed-password", userCaptor.getValue().getPassword());
        verify(assignments).save(any(JudgeAssignment.class));
        ArgumentCaptor<JudgeInvitation> invitationCaptor =
                ArgumentCaptor.forClass(JudgeInvitation.class);
        verify(invitations).save(invitationCaptor.capture());
        assertEquals(JudgeInvitationStatus.ACCEPTED, invitationCaptor.getValue().getStatus());
        assertNull(invitationCaptor.getValue().getInvitationTokenHash());
    }

    @Test
    void expiredInvitationCannotBeAcceptedAndIsMarkedExpired() throws Exception {
        mockTransactionRunner();
        String token = "expired-token";
        JudgeInvitation invitation = invitedRecord(token);
        invitation.setInvitationExpiresAt(java.time.LocalDateTime.now().minusMinutes(1));
        when(invitations.findByInvitationTokenHashAndStatus(
                sha256(token), JudgeInvitationStatus.INVITED))
                .thenReturn(Optional.of(invitation));
        when(invitations.save(any(JudgeInvitation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        assertThrows(BadRequestException.class, () -> service.acceptInvitation(
                token, new AcceptJudgeInvitationRequest(), null));
        assertEquals(JudgeInvitationStatus.EXPIRED, invitation.getStatus());
        verify(users, never()).save(any(User.class));
        verify(assignments, never()).save(any(JudgeAssignment.class));
    }

    @Test
    void revokingInvitationInvalidatesItsTokenWithoutDeletingHistory() {
        JudgeInvitation invitation = JudgeInvitation.builder()
                .id("invitation-1")
                .roundId("round-1")
                .email("judge@example.com")
                .status(JudgeInvitationStatus.INVITED)
                .invitationTokenHash("token-hash")
                .build();
        when(rounds.findById("round-1")).thenReturn(Optional.of(draftRound));
        when(validator.getAndValidateJudgingActivity("activity-1", "organizer-1"))
                .thenReturn(activity);
        when(invitations.findById("invitation-1")).thenReturn(Optional.of(invitation));
        when(invitations.save(any(JudgeInvitation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(activities.findById("activity-1")).thenReturn(Optional.of(activity));
        when(users.findByEmail("judge@example.com")).thenReturn(Optional.empty());

        var response = service.revokeInvitation("round-1", "invitation-1", "organizer-1");

        assertEquals(JudgeInvitationStatus.REVOKED, response.getStatus());
        assertEquals(JudgeInvitationStatus.REVOKED, invitation.getStatus());
        assertNull(invitation.getInvitationTokenHash());
        verify(invitations, never()).delete(any(JudgeInvitation.class));
    }

    private JudgeInvitation invitedRecord(String token) throws Exception {
        return JudgeInvitation.builder()
                .id("invitation-1")
                .roundId("round-1")
                .activityId("activity-1")
                .organizerId("organizer-1")
                .email("judge@example.com")
                .status(JudgeInvitationStatus.INVITED)
                .invitationTokenHash(sha256(token))
                .invitationExpiresAt(java.time.LocalDateTime.now().plusDays(2))
                .build();
    }

    private String sha256(String token) throws Exception {
        return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256")
                        .digest(token.getBytes(StandardCharsets.UTF_8)));
    }

    private void mockTransactionRunner() {
        when(transactionRunner.run(
                org.mockito.ArgumentMatchers.<Supplier<JudgeInvitationResponse>>any()))
                .thenAnswer(invocation ->
                        ((Supplier<?>) invocation.getArgument(0)).get());
    }
}
