package com.vansh.eventsphere.eventsphere.auth.dto;
import jakarta.validation.constraints.*;
import lombok.Data;


@Data 
public class AcceptCollegeAdminInvitationRequest {
 @NotBlank private String token;

 @NotBlank @Size(min=8) 
 private String password;
}
