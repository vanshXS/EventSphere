package com.vansh.eventsphere.eventsphere.auth.dto;

import com.vansh.eventsphere.eventsphere.user.model.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {


    private String userId;
    private String name;
    private String email;
    private Role role;
    private String collegeId;
    private String collegeName;
    private String collegeCode;

}

