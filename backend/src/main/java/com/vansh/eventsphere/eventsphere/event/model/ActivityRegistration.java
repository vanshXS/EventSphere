package com.vansh.eventsphere.eventsphere.event.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "activity_registration")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ActivityRegistration {

    @Id
    private String id;
    private String activityId;
    private String eventId;
    private String participantId;
    private String teamId;
    private RegistrationStatus status;
    private RegistrationType registrationType;
    private LocalDateTime registeredAt;
}
