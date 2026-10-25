
package com.vansh.eventsphere.eventsphere.judge.controller;

import com.vansh.eventsphere.eventsphere.judge.dto.CreateJudgingRoundRequest;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeRoundResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.RoundClosurePreviewResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.UpdateJudgeRoundRequest;
import com.vansh.eventsphere.eventsphere.judge.service.JudgingRoundService;

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
public class OrganizerJudgingRoundController {

    private final JudgingRoundService judgingRoundService;

    @PostMapping("/activities/{activityId}/judging-rounds")
    public ResponseEntity<JudgeRoundResponse> createRound(
            @PathVariable String activityId,
            @Valid @RequestBody CreateJudgingRoundRequest request,
            Authentication authentication) {

        String organizerId = authentication.getName();

        JudgeRoundResponse response =
                judgingRoundService.createRound(
                        activityId,
                        request,
                        organizerId);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/activities/{activityId}/judging-rounds")
    public ResponseEntity<List<JudgeRoundResponse>> getRoundsByActivity(
            @PathVariable String activityId,
            Authentication authentication) {

        String organizerId = authentication.getName();

        List<JudgeRoundResponse> rounds =
                judgingRoundService.getRoundsByActivity(
                        activityId,
                        organizerId);

        return ResponseEntity.ok(rounds);
    }

    @PutMapping("/judging-rounds/{roundId}")
    public ResponseEntity<JudgeRoundResponse> updateDraftRound(
            @PathVariable String roundId,
            @Valid @RequestBody UpdateJudgeRoundRequest request,
            Authentication authentication) {

        JudgeRoundResponse response = judgingRoundService.updateDraftRound(
                roundId, request, authentication.getName());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/judging-rounds/{roundId}/open")
    public ResponseEntity<JudgeRoundResponse> openRound(
            @PathVariable String roundId,
            Authentication authentication) {

        String organizerId = authentication.getName();

        JudgeRoundResponse response =
                judgingRoundService.openRound(
                        roundId,
                        organizerId);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/judging-rounds/{roundId}/close")
    public ResponseEntity<JudgeRoundResponse> closeRound(
            @PathVariable String roundId,
            Authentication authentication) {

        String organizerId = authentication.getName();

        JudgeRoundResponse response =
                judgingRoundService.closeRound(
                        roundId,
                        organizerId);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/judging-rounds/{roundId}/closure-preview")
    public ResponseEntity<RoundClosurePreviewResponse> getClosurePreview(
            @PathVariable String roundId,
            Authentication authentication) {

        return ResponseEntity.ok(
                judgingRoundService.getClosurePreview(
                        roundId,
                        authentication.getName()));
    }
}
