package com.vansh.eventsphere.eventsphere.judge.controller;

import com.vansh.eventsphere.eventsphere.judge.dto.JudgeEvaluationResponse;
import com.vansh.eventsphere.eventsphere.judge.dto.SaveJudgeEvaluationRequest;
import com.vansh.eventsphere.eventsphere.judge.service.JudgeEvaluationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(
        "/api/judge/judging-rounds/{roundId}/registrations/{registrationId}/evaluation"
)
@RequiredArgsConstructor
public class JudgeEvaluationController {

    private final JudgeEvaluationService judgeEvaluationService;

    /**
     * Save or update an evaluation draft.
     * Partial scores are permitted.
     */
    @PutMapping("/draft")
    public JudgeEvaluationResponse saveDraft(
            @PathVariable String roundId,
            @PathVariable String registrationId,
            @Valid @RequestBody SaveJudgeEvaluationRequest request,
            Authentication authentication
    ) {
        return judgeEvaluationService.saveDraft(
                roundId,
                registrationId,
                request,
                authentication.getName()
        );
    }

    /**
     * Submit a complete evaluation.
     * The service validates every criterion and calculates the total score.
     */
    @PostMapping("/submit")
    @ResponseStatus(HttpStatus.OK)
    public JudgeEvaluationResponse submitEvaluation(
            @PathVariable String roundId,
            @PathVariable String registrationId,
            @Valid @RequestBody SaveJudgeEvaluationRequest request,
            Authentication authentication
    ) {
        return judgeEvaluationService.submitEvaluation(
                roundId,
                registrationId,
                request,
                authentication.getName()
        );
    }

    /**
     * Retrieve the authenticated judge's own evaluation.
     */
    @GetMapping
    public JudgeEvaluationResponse getMyEvaluation(
            @PathVariable String roundId,
            @PathVariable String registrationId,
            Authentication authentication
    ) {
        return judgeEvaluationService.getMyEvaluation(
                roundId,
                registrationId,
                authentication.getName()
        );
    }
}