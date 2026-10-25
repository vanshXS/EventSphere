
package com.vansh.eventsphere.eventsphere.judge.controller;

import com.vansh.eventsphere.eventsphere.judge.dto.CompetitionResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.CreateCompetitionRequest;
import com.vansh.eventsphere.eventsphere.judge.service.CompetitionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/organizer/activities/{activityId}/competition")
@RequiredArgsConstructor
public class OrganizerCompetitionController {

    private final CompetitionService competitionService;

    @PostMapping
    public ResponseEntity<CompetitionResponse> createCompetition(
            @PathVariable String activityId,
            @Valid @RequestBody CreateCompetitionRequest request,
            Authentication authentication) {

        String organizerId = authentication.getName();

        CompetitionResponse response =
                competitionService.createForActivity(
                        activityId,
                        request,
                        organizerId);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<CompetitionResponse> getCompetition(
            @PathVariable String activityId,
            Authentication authentication) {

        String organizerId = authentication.getName();

        CompetitionResponse response =
                competitionService.getByActivity(
                        activityId,
                        organizerId);

        return ResponseEntity.ok(response);
    }

    @PutMapping
    public ResponseEntity<CompetitionResponse> updateCompetition(
            @PathVariable String activityId,
            @Valid @RequestBody CreateCompetitionRequest request,
            Authentication authentication) {
        CompetitionResponse response = competitionService.updateForActivity(
                activityId, request, authentication.getName());
        return ResponseEntity.ok(response);
    }
}
