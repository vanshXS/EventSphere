package com.vansh.eventsphere.eventsphere.judge.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AssignJudgeRequest {

    @Size(max = 100)
    private String judgeId;

    @Email
    @Size(max = 254)
    private String email;

    @AssertTrue(message = "Provide exactly one judge user ID or email address.")
    public boolean isExactlyOneTargetProvided() {
        boolean hasJudgeId = judgeId != null && !judgeId.isBlank();
        boolean hasEmail = email != null && !email.isBlank();
        return hasJudgeId != hasEmail;
    }
}
