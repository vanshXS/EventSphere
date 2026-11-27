package com.vansh.eventsphere.eventsphere.college.model;

import java.time.LocalDateTime;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.*;

@Document(collection = "college_admin_invitations")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CollegeAdminInvitation {
    @Id private String id;
    @Indexed private String tokenHash;
    @Indexed private String applicationId;
    private String collegeId;
    private String nomineeEmail;
    private LocalDateTime expiresAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime createdAt;
}
