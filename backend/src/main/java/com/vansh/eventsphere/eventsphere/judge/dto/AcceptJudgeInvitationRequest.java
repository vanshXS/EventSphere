package com.vansh.eventsphere.eventsphere.judge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcceptJudgeInvitationRequest {

    private String name;
    private String password;
}
