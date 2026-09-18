package com.vansh.eventsphere.eventsphere.event.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "attendance")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Attendance {

    @Id
    private String id;

    @Indexed(unique = true)
    private String registrationId;

    @Indexed
    private String ticketId;

    @Indexed
    private String eventId;

    @Indexed
    private String activityId;

    @Indexed
    private String participantId;

    @Indexed
    private String checkedInBy;

    private LocalDateTime checkedInAt;
    private long revision;
}
