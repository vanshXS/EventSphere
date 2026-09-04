package com.vansh.eventsphere.eventsphere.event.dto;

import com.vansh.eventsphere.eventsphere.user.model.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberDto {
    private String userId;
    private String name;
    private String email;
    private Role role;
    private boolean leader;
}
