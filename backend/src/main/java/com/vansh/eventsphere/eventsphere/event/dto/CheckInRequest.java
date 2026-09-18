package com.vansh.eventsphere.eventsphere.event.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckInRequest {

    @NotBlank(message = "QR payload is required")
    private String qrPayload;
}
