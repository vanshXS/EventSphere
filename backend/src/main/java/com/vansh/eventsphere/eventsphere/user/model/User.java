package com.vansh.eventsphere.eventsphere.user.model;

import java.time.LocalDateTime;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Builder;

@Document(collection = "users")
@Data
@Builder
public class User {

    @Id
    private String userId;
    private String name;
    private String email;
    private String password;
    private Role role;
    private String collegeId;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private String collegeVerificationStatus;
    private LocalDateTime collegeVerifiedAt;
    private String collegeVerifiedBy;
}