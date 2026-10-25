package com.vansh.eventsphere.eventsphere.judge.controller;

import com.vansh.eventsphere.eventsphere.judge.dto.AcceptJudgeInvitationRequest;
import com.vansh.eventsphere.eventsphere.judge.dto.JudgeInvitationResponse;
import com.vansh.eventsphere.eventsphere.judge.service.JudgeInvitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/judge/invitations")
@RequiredArgsConstructor
public class JudgeInvitationController {

    private final JudgeInvitationService judgeInvitationService;

    @GetMapping("/{token}")
    public JudgeInvitationResponse getInvitation(@PathVariable String token) {
        return judgeInvitationService.getInvitation(token);
    }

    @PostMapping("/{token}/accept")
    public JudgeInvitationResponse acceptInvitation(
            @PathVariable String token,
            @RequestBody(required = false) AcceptJudgeInvitationRequest request,
            Authentication authentication
    ) {
        if (request == null) {
            request = new AcceptJudgeInvitationRequest();
        }

        String authenticatedUserId = authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())
                ? null
                : authentication.getName();

        return judgeInvitationService.acceptInvitation(
                token, request, authenticatedUserId);
    }
}
