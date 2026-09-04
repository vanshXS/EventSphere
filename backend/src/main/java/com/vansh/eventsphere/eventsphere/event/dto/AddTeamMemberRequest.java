package com.vansh.eventsphere.eventsphere.event.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AddTeamMemberRequest {

    @NotBlank(message = "Member ID is required.")
    private String memberId;
}
