package com.vansh.eventsphere.eventsphere.judge.controller;

import com.vansh.eventsphere.eventsphere.judge.dto.JudgeAssignedRoundResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeEligibleRegistrationResponse;
import com.vansh.eventsphere.eventsphere.judge.service.JudgeDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/judge")
@RequiredArgsConstructor
public class JudgeDashboardController {

    private final JudgeDashboardService judgeDashboardService;

    @GetMapping("/rounds")
    public List<JudgeAssignedRoundResponse> getMyAssignedRounds(
            Authentication authentication
    ) {
        return judgeDashboardService.getMyAssignedRounds(
                authentication.getName()
        );
    }

    @GetMapping("/judging-rounds/{roundId}/registrations")
    public List<JudgeEligibleRegistrationResponse> getEligibleRegistrations(
            @PathVariable String roundId,
            Authentication authentication
    ) {
        return judgeDashboardService.getEligibleRegistrations(
                roundId,
                authentication.getName()
        );
    }
}