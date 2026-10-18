
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
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizer")
@RequiredArgsConstructor
public class OrganizerJudgeAssignmentController {

    private final JudgeAssignmentService judgeAssignmentService;

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
