package com.vansh.eventsphere.eventsphere.event.dto;

import com.vansh.eventsphere.eventsphere.event.model.RegistrationType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ActivityRegistrationRequest {

    @NotNull(message = "Registration type is required.")
    private RegistrationType registrationType;
    private String teamId;

}
