package com.vansh.eventsphere.eventsphere.certificate.models;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

/** One explicitly selected published final round per activity. */
@Document(collection = "certificate_final_rounds")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CertificateFinalRound {
    @Id private String activityId;
    private String roundId;
    private String selectedBy;
    private Instant selectedAt;
}
