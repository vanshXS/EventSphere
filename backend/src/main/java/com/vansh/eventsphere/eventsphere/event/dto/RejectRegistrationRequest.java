package com.vansh.eventsphere.eventsphere.event.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RejectRegistrationRequest {

    @Size(
            max = 500,
            message = "Rejection reason cannot exceed 500 characters."
    )
    private String reason;
}