package com.vansh.eventsphere.eventsphere.college.model;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "college_admin_assignments")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CollegeAdminAssignment {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String collegeId;

    private List<String> permissions;

    private String status;

    private String assignedBy;

    private LocalDateTime assignedAt;

    private LocalDateTime revokedAt;
}