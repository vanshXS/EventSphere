package com.vansh.eventsphere.eventsphere.college.dto;

import java.util.List;

import lombok.Data;

@Data
public class AssignCollegeAdminRequest {
    private String email;
    private List<String> permissions;
}