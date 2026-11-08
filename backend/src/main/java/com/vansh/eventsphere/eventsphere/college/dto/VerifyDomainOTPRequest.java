package com.vansh.eventsphere.eventsphere.college.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VerifyDomainOTPRequest {

    private String email;

    @NotBlank
    @Size(min = 6, max = 6)
    private String otp;
}