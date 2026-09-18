package com.vansh.eventsphere.eventsphere.event.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InviteStaffRequest {

    @NotBlank(message = "Volunteer email is required")
    @Email(message = "Volunteer email must be valid")
    private String email;

    @Size(max = 100, message = "Name cannot exceed 100 characters")
    private String name;
}
