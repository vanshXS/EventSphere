package com.vansh.eventsphere.eventsphere.refresh_token.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "refresh_tokens")
@Data
@Builder 
@NoArgsConstructor @AllArgsConstructor
public class RefreshToken {

    @Id
    private String id;
    private String userId;
    private String tokenHash;
    private LocalDateTime expiredAt;

    private boolean revoked;
    private LocalDateTime createdAt;
    
}
