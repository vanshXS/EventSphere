package com.vansh.eventsphere.eventsphere.event.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangeTeamLeaderRequest {

    @NotBlank(message = "Leader ID is required")
    private String leaderId;
}
