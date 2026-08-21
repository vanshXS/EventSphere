package com.vansh.eventsphere.eventsphere.event.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "activities")
@Data
@Builder
@NoArgsConstructor @AllArgsConstructor
public class Activity {

    @Id
    private String id;

    @Indexed
    private String eventId;
    private String name;
    private String description;
    private ActivityType type;
    private String rules;
    private RegistrationType registrationType;
    private LocalDateTime registrationDeadline;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;

    private String location;
    private Integer capacity;
    private Integer minTeamSize;
    private Integer maxTeamSize;
}
