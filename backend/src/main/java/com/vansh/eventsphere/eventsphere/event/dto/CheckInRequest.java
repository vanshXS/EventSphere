package com.vansh.eventsphere.eventsphere.event.dto;

import com.vansh.eventsphere.eventsphere.event.model.CheckInType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckInRequest {

    @NotBlank(message = "QR payload is required")
    private String qrPayload;

    @NotNull(message = "Check-in type is required")
    private CheckInType checkInType;
}
