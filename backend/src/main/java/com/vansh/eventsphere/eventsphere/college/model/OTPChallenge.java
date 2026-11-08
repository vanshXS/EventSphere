package com.vansh.eventsphere.eventsphere.college.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "otp_challenges")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OTPChallenge {

    @Id
    private String id;

    @Indexed
    private String targetId;

    @Indexed
    private String email;

    private String purpose;

    private String otpHash;

    private int attempts;

    private int maxAttempts;

    private LocalDateTime expiresAt;

    private LocalDateTime createdAt;

    private LocalDateTime lastSentAt;
}