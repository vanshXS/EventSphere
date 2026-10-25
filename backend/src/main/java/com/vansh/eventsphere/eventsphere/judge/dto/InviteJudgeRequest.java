package com.vansh.eventsphere.eventsphere.judge.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteJudgeRequest {

    @NotBlank(message = "Judge email is required.")
    @Email(message = "Please provide a valid email address.")
    private String email;

    private String name;
}
