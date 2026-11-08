package com.vansh.eventsphere.eventsphere.college.dto;

import lombok.Data;

@Data
public class DomainOTPRequest {
    private String email;
    private String domain;
}