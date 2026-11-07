package com.vansh.eventsphere.eventsphere.judge.controller;

import com.vansh.eventsphere.eventsphere.judge.dto.JudgeResultsResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.ParticipantLeaderboardResponse;
import com.vansh.eventsphere.eventsphere.judge.service.JudgingResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class JudgingResultController {

    private final JudgingResultService judgingResultService;

    @PostMapping(
            "/api/organizer/judging-rounds/{roundId}/publish-results"
    )
    public JudgeResultsResponse publishResults(
            @PathVariable String roundId,
            Authentication authentication
    ) {
        return judgingResultService.publishResults(
                roundId,
                authentication.getName()
        );
    }

    @GetMapping(
            "/api/organizer/judging-rounds/{roundId}/results"
    )
    public JudgeResultsResponse getOrganizerResults(
            @PathVariable String roundId,
            Authentication authentication
    ) {
        return judgingResultService.getOrganizerResults(
                roundId,
                authentication.getName()
        );
    }

    @GetMapping(
            "/api/participant/judging-rounds/{roundId}/results"
    )
    public JudgeResultsResponse getParticipantResults(
            @PathVariable String roundId,
            Authentication authentication
    ) {
        return judgingResultService.getParticipantResults(
                roundId,
                authentication.getName()
        );
    }

    @GetMapping(
            "/api/participant/judging-results/me"
    )
    public List<ParticipantLeaderboardResponse> getParticipantLeaderboardResults(
            Authentication authentication
    ) {
        return judgingResultService.getParticipantLeaderboardResults(
                authentication.getName()
        );
    }
}