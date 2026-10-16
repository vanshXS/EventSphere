package com.vansh.eventsphere.eventsphere.event.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AcceptStaffInvitationRequest {

    private String name;
    private String password;
}
