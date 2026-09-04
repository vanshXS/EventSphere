package com.vansh.eventsphere.eventsphere.event.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateTeamRequest {

    @NotBlank(message = "Team name is required.")
    @Size(max = 100, message = "Team name cannot exceed 100 characters")
    private String name;
}
