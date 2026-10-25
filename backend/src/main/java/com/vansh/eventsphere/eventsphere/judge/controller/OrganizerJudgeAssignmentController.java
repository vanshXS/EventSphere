
package com.vansh.eventsphere.eventsphere.judge.controller;

import com.vansh.eventsphere.eventsphere.judge.dto.AssignJudgeRequest;
import com.vansh.eventsphere.eventsphere.judge.dto.AssignJudgesToRoundsRequest;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeAssignmentResponse;
import com.vansh.eventsphere.eventsphere.judge.service.JudgeAssignmentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import com.vansh.eventsphere.eventsphere.judge.dto.InviteJudgeRequest;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeInvitationResponse;
import com.vansh.eventsphere.eventsphere.judge.service.JudgeInvitationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizer")
@RequiredArgsConstructor
public class OrganizerJudgeAssignmentController {

    private final JudgeAssignmentService judgeAssignmentService;
    private final JudgeInvitationService judgeInvitationService;

    /**
     * Invites a judge by email to a judging round, generating a secure onboarding link.
     */
    @PostMapping("/judging-rounds/{roundId}/judges/invite")
    public ResponseEntity<JudgeInvitationResponse> inviteJudge(
            @PathVariable String roundId,
            @Valid @RequestBody InviteJudgeRequest request,
            Authentication authentication) {

        JudgeInvitationResponse response =
                judgeInvitationService.inviteJudge(
                        roundId,
                        request,
                        authentication.getName());

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    /**
     * Lists all judge invitations (pending, accepted, revoked) for a round.
     */
    @GetMapping("/judging-rounds/{roundId}/judges/invitations")
    public ResponseEntity<List<JudgeInvitationResponse>> getInvitations(
            @PathVariable String roundId,
            Authentication authentication) {

        List<JudgeInvitationResponse> invitations =
                judgeInvitationService.getRoundInvitations(
                        roundId,
                        authentication.getName());

        return ResponseEntity.ok(invitations);
    }

    /**
     * Revokes a pending judge invitation.
     */
    @DeleteMapping("/judging-rounds/{roundId}/judges/invitations/{invitationId}")
    public ResponseEntity<JudgeInvitationResponse> revokeInvitation(
            @PathVariable String roundId,
            @PathVariable String invitationId,
            Authentication authentication) {

        JudgeInvitationResponse response =
                judgeInvitationService.revokeInvitation(
                        roundId,
                        invitationId,
                        authentication.getName());

        return ResponseEntity.ok(response);
    }

    /**
     * Assigns one judge to one draft round.
     */
    @PostMapping("/judging-rounds/{roundId}/judges")
    public ResponseEntity<JudgeAssignmentResponse> assignJudge(
            @PathVariable String roundId,
            @Valid @RequestBody AssignJudgeRequest request,
            Authentication authentication) {

        JudgeAssignmentResponse response =
                judgeAssignmentService.assignJudgeToRound(
                        roundId,
                        request.getJudgeId(),
                        request.getEmail(),
                        authentication.getName());

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    /**
     * Revokes a judge's assignment without deleting its history.
     */
    @DeleteMapping("/judging-rounds/{roundId}/judges/{judgeId}")
    public ResponseEntity<JudgeAssignmentResponse> revokeJudge(
            @PathVariable String roundId,
            @PathVariable String judgeId,
            Authentication authentication) {

        JudgeAssignmentResponse response =
                judgeAssignmentService.revokeJudgeFromRound(
                        roundId,
                        judgeId,
                        authentication.getName());

        return ResponseEntity.ok(response);
    }

    /**
     * Lists active and revoked assignments for a round.
     */
    @GetMapping("/judging-rounds/{roundId}/judges")
    public ResponseEntity<List<JudgeAssignmentResponse>> getAssignments(
            @PathVariable String roundId,
            Authentication authentication) {

        List<JudgeAssignmentResponse> assignments =
                judgeAssignmentService.getAssignments(
                        roundId,
                        authentication.getName());

        return ResponseEntity.ok(assignments);
    }

    /**
     * Applies a panel to multiple draft rounds belonging to one Activity.
     */
    @PostMapping("/judge-assignments/bulk")
    public ResponseEntity<List<JudgeAssignmentResponse>> assignJudgesToRounds(
            @Valid @RequestBody AssignJudgesToRoundsRequest request,
            Authentication authentication) {

        List<JudgeAssignmentResponse> assignments =
                judgeAssignmentService.assignJudgesToRounds(
                        request.getRoundIds(),
                        request.getJudgeIds(),
                        authentication.getName());

        return ResponseEntity.ok(assignments);
    }

    /**
     * Copies the active panel from a source round to a target draft round.
     */
    @PostMapping(
            "/judging-rounds/{sourceRoundId}/copy-assignments/{targetRoundId}")
    public ResponseEntity<List<JudgeAssignmentResponse>> copyAssignments(
            @PathVariable String sourceRoundId,
            @PathVariable String targetRoundId,
            Authentication authentication) {

        List<JudgeAssignmentResponse> assignments =
                judgeAssignmentService.copyAssignmentsFromRound(
                        sourceRoundId,
                        targetRoundId,
                        authentication.getName());

        return ResponseEntity.ok(assignments);
    }
}
